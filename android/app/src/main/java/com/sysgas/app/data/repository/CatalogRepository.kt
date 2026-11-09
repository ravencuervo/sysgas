package com.sysgas.app.data.repository

import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.CylinderProduct
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class RemoteProductDto(
    val id: String,
    val capacidad: String,
    @SerialName("nombre_comercial") val nombreComercial: String,
    @SerialName("peso_neto_gas_kg") val pesoNetoGasKg: Double,
    @SerialName("tara_promedio_kg") val taraPromedioKg: Double,
    @SerialName("precio_venta_pen") val precioVentaPen: Double,
    val dimensiones: String,
    val descripcion: String = "",
    @SerialName("disponible_en_puno") val disponibleEnPuno: Boolean = true
)

class CatalogRepository {

    suspend fun getCatalog(): List<CylinderProduct> = withContext(Dispatchers.IO) {
        try {
            val client = SupabaseClientProvider.client
            val remoteList = client.from("productos_catalogo")
                .select {
                    filter {
                        eq("disponible_en_puno", true)
                    }
                }
                .decodeList<RemoteProductDto>()

            if (remoteList.isNotEmpty()) {
                remoteList.map { dto ->
                    CylinderProduct(
                        id = dto.id,
                        capacity = dto.capacidad.replace("kg", " kg"),
                        commercialName = dto.nombreComercial,
                        netGasKg = dto.pesoNetoGasKg,
                        tareKg = dto.taraPromedioKg,
                        pricePen = dto.precioVentaPen,
                        dimensions = dto.dimensiones,
                        description = dto.descripcion,
                        popular = dto.capacidad.contains("10"),
                        specs = listOf(
                            "Tara: %.1f kg".format(dto.taraPromedioKg),
                            "Gas neto: %.1f kg".format(dto.pesoNetoGasKg),
                            "Sello hermético probado"
                        )
                    )
                }
            } else {
                CylinderProduct.DEFAULT_PRODUCTS
            }
        } catch (e: Exception) {
            // Contingencia offline garantizada
            CylinderProduct.DEFAULT_PRODUCTS
        }
    }
}
