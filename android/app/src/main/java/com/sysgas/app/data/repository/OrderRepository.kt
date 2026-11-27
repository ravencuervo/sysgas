package com.sysgas.app.data.repository

import com.sysgas.app.BuildConfig
import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.Order
import com.sysgas.app.domain.model.OrderStatus
import com.sysgas.app.domain.model.PaymentMethod
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order as SortOrder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.net.HttpURLConnection
import java.net.URL
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
        private val json = Json { ignoreUnknownKeys = true }
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
        paymentMethod: PaymentMethod
    ): Result<Order> = withContext(Dispatchers.IO) {
        try {
            val client = SupabaseClientProvider.client
            val token = client.auth.currentAccessTokenOrNull()
                ?: return@withContext Result.failure(Exception("Debes iniciar sesión para realizar un pedido."))

            if (customerName.trim().length < 2) {
                return@withContext Result.failure(Exception("Ingresa tu nombre completo."))
            }
            if (customerPhone.filter { it.isDigit() }.length < 6) {
                return@withContext Result.failure(Exception("Ingresa un número de celular válido."))
            }
            if (addressText.trim().length < 4) {
                return@withContext Result.failure(Exception("Ingresa la dirección de entrega."))
            }

            val normalizedCapacity = when {
                capacity.contains("5") -> "5kg"
                capacity.contains("45") -> "45kg"
                else -> "10kg"
            }
            val metodoPagoDb = when (paymentMethod) {
                PaymentMethod.YAPE -> "yape"
                PaymentMethod.PLIN -> "plin"
                PaymentMethod.CARD -> "tarjeta"
                PaymentMethod.CASH -> "efectivo"
            }
            val totalPen = pricePerUnit * quantity

            val payload = buildJsonObject {
                put("nombre_destinatario", customerName.trim())
                put("telefono_contacto", customerPhone.trim())
                put("ciudad", city)
                put("direccion_entrega", addressText.trim())
                put("referencia_direccion", addressReference.trim())
                put("capacidad", normalizedCapacity)
                put("cantidad", quantity)
                put("total_pedido_pen", totalPen)
                put("metodo_pago", metodoPagoDb)
            }.toString()

            val endpoint = BuildConfig.BACKEND_API_URL.trimEnd('/') + "/api/mobile/pedidos"
            val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 20000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Authorization", "Bearer $token")
            }

            conn.outputStream.use { os ->
                os.write(payload.toByteArray(Charsets.UTF_8))
            }

            val statusCode = conn.responseCode
            val responseBody = (if (statusCode in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""

            if (statusCode !in 200..299) {
                val parsedMsg = runCatching {
                    json.parseToJsonElement(responseBody).jsonObject["error"]?.jsonPrimitive?.content
                }.getOrNull()
                return@withContext Result.failure(
                    Exception(parsedMsg ?: "No se pudo registrar el pedido (código $statusCode).")
                )
            }

            val ticketCode = runCatching {
                json.parseToJsonElement(responseBody).jsonObject["codigo_ticket"]?.jsonPrimitive?.content
            }.getOrNull() ?: "TK-SYSGAS"

            refreshOrders()
            val created = _orders.value.firstOrNull { it.ticketCode == ticketCode }
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
                    totalPen = totalPen,
                    paymentMethod = paymentMethod,
                    status = OrderStatus.PENDING,
                    distributorName = "Distribuidora SYSGAS",
                    distributorPhone = "",
                    createdAt = "Recién registrado"
                ).also {
                    _orders.value = listOf(it) + _orders.value
                    _activeOrder.value = it
                }

            Result.success(created)
        } catch (_: Exception) {
            Result.failure(Exception("No se pudo conectar con el servidor. Verifica tu internet e intenta nuevamente."))
        }
    }

    private fun mapOrderStatus(raw: String): OrderStatus = when (raw.lowercase()) {
        "pendiente" -> OrderStatus.PENDING
        "confirmado", "asignado", "asignado_chofer" -> OrderStatus.CONFIRMED
        "en_ruta", "en_camino" -> OrderStatus.IN_TRANSIT
        "en_puerta" -> OrderStatus.ARRIVING
        "entregado" -> OrderStatus.DELIVERED
        "cancelado" -> OrderStatus.CANCELLED
        else -> OrderStatus.PENDING
    }

    private fun mapPaymentMethod(raw: String): PaymentMethod = when (raw.lowercase()) {
        "yape" -> PaymentMethod.YAPE
        "plin" -> PaymentMethod.PLIN
        "tarjeta" -> PaymentMethod.CARD
        else -> PaymentMethod.CASH
    }
}
