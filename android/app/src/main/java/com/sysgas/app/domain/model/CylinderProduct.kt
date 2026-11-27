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
}

