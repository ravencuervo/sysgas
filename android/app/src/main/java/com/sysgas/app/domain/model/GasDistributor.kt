package com.sysgas.app.domain.model

data class GasDistributor(
    val id: String,
    val name: String,
    val branchName: String,
    val address: String,
    val distanceMeters: Int,
    val estimatedTimeMinutes: Int,
    val motorizedDriverName: String,
    val motorizedVehicle: String,
    val motorizedLicense: String,
    val stock10kg: Int,
    val price10kg: Double,
    val price5kg: Double,
    val price45kg: Double,
    val rating: Double,
    val phoneYape: String,
    val isRecommendedByGps: Boolean = false
) {
    fun priceFor(capacity: String): Double {
        return when {
            capacity.contains("5") -> price5kg
            capacity.contains("45") -> price45kg
            else -> price10kg
        }
    }

    val formattedDistance: String
        get() = if (distanceMeters <= 0) "En tu zona" else if (distanceMeters < 1000) "$distanceMeters m" else String.format("%.1f km", distanceMeters / 1000.0)
}
