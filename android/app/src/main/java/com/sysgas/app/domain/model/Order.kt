package com.sysgas.app.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class PaymentMethod(val displayName: String, val hint: String) {
    YAPE("Yape", "Pago móvil inmediato al 951 667 696"),
    PLIN("Plin", "Transferencia interbancaria móvil"),
    CASH("Efectivo al recibir", "Paga exacto o solicita vuelto"),
    CARD("Tarjeta de crédito / débito", "El repartidor lleva POS inalámbrico")
}

@Serializable
enum class OrderStatus(val label: String, val stepIndex: Int) {
    PENDING("Solicitado", 0),
    CONFIRMED("Confirmado por Planta", 1),
    IN_TRANSIT("En Camino con Camión", 2),
    ARRIVING("En tu Puerta", 3),
    DELIVERED("Entregado y Verificado", 4),
    CANCELLED("Cancelado", -1)
}

@Serializable
data class Order(
    val id: String,
    val ticketCode: String,
    val customerName: String,
    val customerPhone: String,
    val addressText: String,
    val addressReference: String,
    val city: String = "Puno",
    val productCapacity: String,
    val quantity: Int = 1,
    val totalPen: Double,
    val paymentMethod: PaymentMethod,
    val status: OrderStatus = OrderStatus.IN_TRANSIT,
    val distributorName: String = "Distribuidora Altiplano Gas",
    val distributorPhone: String = "+51951667696",
    val createdAt: String = "Hoy, 10:30 AM",
    val deliveryLat: Double = -15.8402,
    val deliveryLng: Double = -70.0219
) {
    val formattedTotal: String
        get() = "S/ %.2f".format(totalPen)
}

