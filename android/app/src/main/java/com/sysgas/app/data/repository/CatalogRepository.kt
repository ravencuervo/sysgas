package com.sysgas.app.data.repository

import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.CylinderProduct
import com.sysgas.app.domain.model.GasDistributor
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

@Serializable
internal data class RemoteDistributorDto(
    val id: String,
    @SerialName("razon_social") val razonSocial: String,
    @SerialName("nombre_comercial") val nombreComercial: String? = null,
    val ciudad: String = "Puno",
    val direccion: String = "",
    @SerialName("telefono_contacto") val telefonoContacto: String = "",
    @SerialName("estado_afiliacion") val estadoAfiliacion: String = "pendiente"
)

class CatalogRepository {

    suspend fun getCatalog(): Result<List<CylinderProduct>> = withContext(Dispatchers.IO) {
        runCatching {
            val client = SupabaseClientProvider.client
            val remoteList = client.from("productos_catalogo")
                .select {
                    filter {
                        eq("disponible_en_puno", true)
                    }
                }
                .decodeList<RemoteProductDto>()

            remoteList.sortedBy { it.pesoNetoGasKg }.map { dto ->
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
                        "Sello hermético verificado"
                    )
                )
            }
        }
    }

    suspend fun getDistributors(): Result<List<GasDistributor>> = withContext(Dispatchers.IO) {
        runCatching {
            val client = SupabaseClientProvider.client
            val products = getCatalog().getOrDefault(emptyList())
            val p5 = products.find { it.capacity.contains("5") }?.pricePen ?: 28.5
            val p10 = products.find { it.capacity.contains("10") }?.pricePen ?: 48.0
            val p45 = products.find { it.capacity.contains("45") }?.pricePen ?: 185.0

            val remoteList = client.from("empresas_distribuidoras")
                .select()
                .decodeList<RemoteDistributorDto>()

            remoteList.mapIndexed { index, dto ->
                GasDistributor(
                    id = dto.id,
                    name = dto.nombreComercial?.takeIf { it.isNotBlank() } ?: dto.razonSocial,
                    branchName = "Sede ${dto.ciudad}",
                    address = dto.direccion,
                    distanceMeters = 0,
                    estimatedTimeMinutes = 25,
                    motorizedDriverName = "Flota autorizada SYSGAS",
                    motorizedVehicle = "Unidad certificada",
                    motorizedLicense = "MTC Vigente",
                    stock10kg = 0,
                    price10kg = p10,
                    price5kg = p5,
                    price45kg = p45,
                    rating = 5.0,
                    phoneYape = dto.telefonoContacto,
                    isRecommendedByGps = index == 0
                )
            }
        }
    }
}
