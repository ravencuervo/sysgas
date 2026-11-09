package com.sysgas.app.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class TruckLocation(
    val orderId: String,
    val driverName: String = "Ramiro Quispe Condori",
    val driverPhone: String = "+51951667696",
    val driverPhotoUrl: String = "",
    val plateNumber: String = "V8X-721",
    val truckModel: String = "Hino Dutro City 4T",
    val currentLat: Double = -15.8360,
    val currentLng: Double = -70.0245,
    val destinationLat: Double = -15.8402,
    val destinationLng: Double = -70.0219,
    val etaMinutes: Int = 11,
    val distanceKm: Double = 1.4,
    val speedKmH: Double = 28.0,
    val lastUpdateIso: String = "Hace 30 seg"
)

