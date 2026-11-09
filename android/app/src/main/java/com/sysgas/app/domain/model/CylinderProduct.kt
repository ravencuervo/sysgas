package com.sysgas.app.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class CylinderProduct(
    val id: String,
    val capacity: String,
    val commercialName: String,
    val netGasKg: Double,
    val tareKg: Double,
    val pricePen: Double,
    val dimensions: String,
    val description: String,
    val popular: Boolean = false,
    val specs: List<String> = emptyList(),
    val iconName: String = "fire"
) {
    val formattedPrice: String
        get() = "S/ %.2f".format(pricePen)

    companion object {
        val DEFAULT_PRODUCTS = listOf(
            CylinderProduct(
                id = "prod-5kg",
                capacity = "5 kg",
                commercialName = "Balón Portátil",
                netGasKg = 5.0,
                tareKg = 6.2,
                pricePen = 28.50,
                dimensions = "38 cm alto × 23 cm ø",
                description = "Ideal para departamentos, campamentos, parrillas y espacios compactos.",
                popular = false,
                specs = listOf("Tara: 6.2 kg", "Gas neto: 5.0 kg", "Válvula de seguridad compacta"),
                iconName = "home"
            ),
            CylinderProduct(
                id = "prod-10kg",
                capacity = "10 kg",
                commercialName = "Balón Familiar",
                netGasKg = 10.0,
                tareKg = 11.5,
                pricePen = 48.00,
                dimensions = "62 cm alto × 30 cm ø",
                description = "El más solicitado para hogares en Puno y Juliaca. Alto rendimiento en frío extremo.",
                popular = true,
                specs = listOf("Tara: 11.5 kg", "Gas neto: 10.0 kg", "Pesaje digital en puerta incluido"),
                iconName = "fire"
            ),
            CylinderProduct(
                id = "prod-45kg",
                capacity = "45 kg",
                commercialName = "Balón Industrial",
                netGasKg = 45.0,
                tareKg = 38.0,
                pricePen = 185.00,
                dimensions = "132 cm alto × 38 cm ø",
                description = "Para restaurantes, panaderías, hoteles y calderas de alta demanda continua.",
                popular = false,
                specs = listOf("Tara: 38.0 kg", "Gas neto: 45.0 kg", "Válvula reforzada tipo POL"),
                iconName = "business"
            )
        )
    }
}
