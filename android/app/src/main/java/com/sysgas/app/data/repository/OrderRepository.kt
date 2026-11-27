package com.sysgas.app.data.repository

import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.Order
import com.sysgas.app.domain.model.OrderStatus
import com.sysgas.app.domain.model.PaymentMethod
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order as SortOrder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

@Serializable
internal data class RemoteOrderDto(
    val id: String,
    @SerialName("codigo_ticket") val codigoTicket: String,
    @SerialName("nombre_destinatario") val nombreDestinatario: String,
    @SerialName("telefono_contacto") val telefonoContacto: String,
    val ciudad: String = "Puno",
    @SerialName("direccion_entrega") val direccionEntrega: String,
    @SerialName("referencia_direccion") val referenciaDireccion: String? = null,
    val estado: String = "pendiente",
    @SerialName("total_pedido_pen") val totalPedidoPen: Double = 0.0,
    @SerialName("metodo_pago") val metodoPago: String = "efectivo",
    @SerialName("latitud_entrega") val latitudEntrega: Double? = null,
    @SerialName("longitud_entrega") val longitudEntrega: Double? = null,
    @SerialName("created_at") val createdAt: String = ""
)

class OrderRepository {

    companion object {
        private val _orders = MutableStateFlow<List<Order>>(emptyList())
        private val _activeOrder = MutableStateFlow<Order?>(null)
    }

    val orders: StateFlow<List<Order>> = _orders.asStateFlow()
    val activeOrder: StateFlow<Order?> = _activeOrder.asStateFlow()

    suspend fun refreshOrders(): Result<List<Order>> = withContext(Dispatchers.IO) {
        runCatching {
            val client = SupabaseClientProvider.client
            val userId = client.auth.currentUserOrNull()?.id
                ?: return@runCatching emptyList()

            val remoteList = client.from("pedidos")
                .select {
                    filter {
                        eq("cliente_id", userId)
                    }
                    order("created_at", SortOrder.DESCENDING)
                }
                .decodeList<RemoteOrderDto>()

            val mapped = remoteList.map { dto ->
                Order(
                    id = dto.id,
                    ticketCode = dto.codigoTicket,
                    customerName = dto.nombreDestinatario,
                    customerPhone = dto.telefonoContacto,
                    addressText = dto.direccionEntrega,
                    addressReference = dto.referenciaDireccion ?: "",
                    city = dto.ciudad,
                    productCapacity = "10 kg",
                    quantity = 1,
                    totalPen = dto.totalPedidoPen,
                    paymentMethod = mapPaymentMethod(dto.metodoPago),
                    status = mapOrderStatus(dto.estado),
                    distributorName = "Distribuidora SYSGAS",
                    distributorPhone = "",
                    createdAt = dto.createdAt.take(16).replace("T", " "),
                    deliveryLat = dto.latitudEntrega ?: -15.8402,
                    deliveryLng = dto.longitudEntrega ?: -70.0219
                )
            }
            _orders.value = mapped
            _activeOrder.value = mapped.firstOrNull {
                it.status != OrderStatus.DELIVERED && it.status != OrderStatus.CANCELLED
            }
            mapped
        }
    }

    suspend fun createOrder(
        customerName: String,
        customerPhone: String,
        addressText: String,
        addressReference: String,
        city: String = "Puno",
        capacity: String,
        quantity: Int,
        pricePerUnit: Double,
        paymentMethod: PaymentMethod,
        empresaId: String? = null
    ): Result<Order> = withContext(Dispatchers.IO) {
        runCatching {
            val client = SupabaseClientProvider.client
            val normalizedCapacity = when {
                capacity.contains("5") -> "5kg"
                capacity.contains("45") -> "45kg"
                else -> "10kg"
            }

            val ticketCode = client.postgrest.rpc(
                function = "crear_pedido_seguro",
                parameters = buildJsonObject {
                    put("p_nombre", customerName.trim())
                    put("p_telefono", customerPhone.trim())
                    put("p_direccion", addressText.trim())
                    put("p_referencia", addressReference.trim())
                    put("p_capacidad", normalizedCapacity)
                    if (!empresaId.isNullOrBlank()) {
                        put("p_empresa", empresaId)
                    } else {
                        put("p_empresa", null as String?)
                    }
                    put("p_ciudad", city)
                    put("p_zona", "")
                    put("p_solicitud", UUID.randomUUID().toString())
                }
            ).decodeAs<String>()

            refreshOrders()
            _orders.value.firstOrNull { it.ticketCode == ticketCode }
                ?: Order(
                    id = UUID.randomUUID().toString(),
                    ticketCode = ticketCode,
                    customerName = customerName.trim(),
                    customerPhone = customerPhone.trim(),
                    addressText = addressText.trim(),
                    addressReference = addressReference.trim(),
                    city = city,
                    productCapacity = capacity,
                    quantity = quantity,
                    totalPen = pricePerUnit * quantity,
                    paymentMethod = paymentMethod,
                    status = OrderStatus.PENDING,
                    distributorName = "Distribuidora SYSGAS",
                    distributorPhone = "",
                    createdAt = "Recién registrado"
                ).also { created ->
                    _orders.value = listOf(created) + _orders.value
                    _activeOrder.value = created
                }
        }
    }

    private fun mapOrderStatus(raw: String): OrderStatus = when (raw) {
        "pendiente" -> OrderStatus.PENDING
        "confirmado", "asignado" -> OrderStatus.CONFIRMED
        "en_ruta" -> OrderStatus.IN_TRANSIT
        "en_puerta" -> OrderStatus.ARRIVING
        "entregado" -> OrderStatus.DELIVERED
        "cancelado" -> OrderStatus.CANCELLED
        else -> OrderStatus.PENDING
    }

    private fun mapPaymentMethod(raw: String): PaymentMethod = when (raw) {
        "yape" -> PaymentMethod.YAPE
        "plin" -> PaymentMethod.PLIN
        "tarjeta" -> PaymentMethod.CARD
        else -> PaymentMethod.CASH
    }
}
