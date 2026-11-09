package com.sysgas.app.data.repository

import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.Order
import com.sysgas.app.domain.model.OrderStatus
import com.sysgas.app.domain.model.PaymentMethod
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.util.UUID
import kotlin.random.Random

class OrderRepository {

    private val _orders = MutableStateFlow<List<Order>>(createSampleOrders())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val _activeOrder = MutableStateFlow<Order?>(_orders.value.firstOrNull { it.status != OrderStatus.DELIVERED })
    val activeOrder: StateFlow<Order?> = _activeOrder.asStateFlow()

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
        val total = pricePerUnit * quantity
        val ticketNumber = Random.nextInt(10000, 99999)
        val newOrder = Order(
            id = UUID.randomUUID().toString(),
            ticketCode = "TK-2026-$ticketNumber",
            customerName = customerName,
            customerPhone = customerPhone,
            addressText = addressText,
            addressReference = addressReference,
            city = city,
            productCapacity = capacity,
            quantity = quantity,
            totalPen = total,
            paymentMethod = paymentMethod,
            status = OrderStatus.IN_TRANSIT,
            distributorName = "Distribuidora Altiplano Gas",
            createdAt = "Hoy, recién solicitado"
        )

        try {
            // Intento de guardado en Supabase (si hay conexión)
            val client = SupabaseClientProvider.client
            client.from("pedidos_clientes").insert(
                mapOf(
                    "codigo_ticket" to newOrder.ticketCode,
                    "nombre_cliente" to newOrder.customerName,
                    "telefono_cliente" to newOrder.customerPhone,
                    "direccion_entrega" to newOrder.addressText,
                    "referencia_direccion" to newOrder.addressReference,
                    "capacidad" to newOrder.productCapacity,
                    "cantidad" to newOrder.quantity,
                    "total_pen" to newOrder.totalPen,
                    "metodo_pago" to newOrder.paymentMethod.name
                )
            )
        } catch (_: Exception) {
            // Continúa localmente si Supabase no responde
        }

        val updatedList = listOf(newOrder) + _orders.value
        _orders.value = updatedList
        _activeOrder.value = newOrder
        Result.success(newOrder)
    }

    private fun createSampleOrders(): List<Order> {
        return listOf(
            Order(
                id = "ord-001",
                ticketCode = "TK-2026-84210",
                customerName = "Wilson Emanuel Cuervo",
                customerPhone = "+51951667696",
                addressText = "Jr. Arequipa 520, Puno",
                addressReference = "Frente al Colegio San Carlos, cerca a Plaza de Armas",
                city = "Puno",
                productCapacity = "10 kg",
                quantity = 1,
                totalPen = 48.00,
                paymentMethod = PaymentMethod.YAPE,
                status = OrderStatus.IN_TRANSIT,
                distributorName = "Distribuidora Altiplano Gas S.A.C.",
                createdAt = "Hoy, hace 15 min"
            ),
            Order(
                id = "ord-002",
                ticketCode = "TK-2026-72109",
                customerName = "Wilson Emanuel Cuervo",
                customerPhone = "+51951667696",
                addressText = "Av. El Sol 840, Puno",
                addressReference = "Edificio Torre del Lago",
                city = "Puno",
                productCapacity = "10 kg",
                quantity = 2,
                totalPen = 96.00,
                paymentMethod = PaymentMethod.CASH,
                status = OrderStatus.DELIVERED,
                distributorName = "Distribuidora San Román Juliaca",
                createdAt = "24 Oct 2026, 11:20 AM"
            )
        )
    }
}
