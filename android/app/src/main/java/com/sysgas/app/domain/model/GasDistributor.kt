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
        get() = if (distanceMeters < 1000) "$distanceMeters m" else String.format("%.1f km", distanceMeters / 1000.0)

    companion object {
        val PUNO_DISTRIBUTORS = listOf(
            GasDistributor(
                id = "dist-01",
                name = "Llamagas Puno",
                branchName = "Sede Puno Centro",
                address = "Jr. Tacna 340, Puno",
                distanceMeters = 850,
                estimatedTimeMinutes = 15,
                motorizedDriverName = "Marcos Quispe Chambi",
                motorizedVehicle = "Torito Bajaj (Placa: 4521-7Z)",
                motorizedLicense = "MTC B-IIc (Vigente)",
                stock10kg = 28,
                price10kg = 48.00,
                price5kg = 28.50,
                price45kg = 185.00,
                rating = 4.9,
                phoneYape = "951 884 120",
                isRecommendedByGps = true
            ),
            GasDistributor(
                id = "dist-02",
                name = "Solgas Puno",
                branchName = "Sucursal Av. Floral",
                address = "Av. Floral 580, Bellavista, Puno",
                distanceMeters = 1800,
                estimatedTimeMinutes = 20,
                motorizedDriverName = "Edwin Condori Luque",
                motorizedVehicle = "Motofurgón Wanxin (Placa: 8812-4Z)",
                motorizedLicense = "MTC B-IIc (Vigente)",
                stock10kg = 16,
                price10kg = 48.50,
                price5kg = 29.00,
                price45kg = 188.00,
                rating = 4.8,
                phoneYape = "951 445 771",
                isRecommendedByGps = false
            ),
            GasDistributor(
                id = "dist-03",
                name = "Pecsa Gas Puno",
                branchName = "Sucursal Laykakota",
                address = "Jr. Lampa 210, Laykakota, Puno",
                distanceMeters = 2400,
                estimatedTimeMinutes = 25,
                motorizedDriverName = "Raúl Mamani Flores",
                motorizedVehicle = "Torito Bajaj (Placa: 3109-1Z)",
                motorizedLicense = "MTC B-IIc (Vigente)",
                stock10kg = 12,
                price10kg = 47.50,
                price5kg = 28.00,
                price45kg = 182.00,
                rating = 4.7,
                phoneYape = "951 992 018",
                isRecommendedByGps = false
            )
        )
    }
}
