package com.sysgas.app.data.repository

import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.PassportData
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@Serializable
internal data class RemotePublicPassportDto(
    @SerialName("codigo_qr") val codigoQr: String = "",
    @SerialName("codigo_serie") val codigoSerie: String = "",
    val capacidad: String = "10kg",
    @SerialName("tara_kg") val taraKg: Double = 0.0,
    val estado: String = "",
    @SerialName("empresa_nombre") val empresaNombre: String? = null,
    @SerialName("empresa_ruc") val empresaRuc: String? = null,
    @SerialName("lote_llenado") val loteLlenado: String? = null,
    @SerialName("presion_prueba_bar") val presionPruebaBar: Double? = null,
    @SerialName("fecha_prueba_hidrostatica") val fechaPrueba: String? = null,
    @SerialName("proxima_inspeccion") val proximaInspeccion: String? = null,
    @SerialName("precinto_seguridad") val precintoSeguridad: String? = null,
    @SerialName("planta_nombre") val plantaNombre: String? = null
)

class PassportRepository {

    suspend fun getPassportByCode(code: String): Result<PassportData?> = withContext(Dispatchers.IO) {
        runCatching {
            val cleanCode = code.trim().uppercase()
            if (cleanCode.isBlank()) return@runCatching null

            val client = SupabaseClientProvider.client
            val remoteList = client.postgrest.rpc(
                function = "pasaporte_publico",
                parameters = buildJsonObject {
                    put("p_codigo", cleanCode)
                }
            ).decodeList<RemotePublicPassportDto>()

            val remote = remoteList.firstOrNull() ?: return@runCatching null
            val netKg = when {
                remote.capacidad.contains("45") -> 45.0
                remote.capacidad.contains("5") -> 5.0
                else -> 10.0
            }

            PassportData(
                cylinderCode = remote.codigoQr.ifBlank { remote.codigoSerie.ifBlank { cleanCode } },
                capacity = remote.capacidad.replace("kg", " kg"),
                tareKg = remote.taraKg,
                grossWeightExpectedKg = remote.taraKg + netKg,
                netGasExpectedKg = netKg,
                distributorName = remote.empresaNombre ?: "Sin distribuidora asignada",
                distributorRuc = remote.empresaRuc ?: "",
                batchNumber = remote.loteLlenado ?: "Sin lote",
                hydrostaticTestBar = remote.presionPruebaBar ?: 0.0,
                hydrostaticTestDate = remote.fechaPrueba ?: "Sin registro",
                nextInspectionDate = remote.proximaInspeccion ?: "Sin registro",
                sealVerified = !remote.precintoSeguridad.isNullOrBlank(),
                sealNumber = remote.precintoSeguridad ?: "Sin precinto",
                status = remote.estado.ifBlank { "VERIFICADO" },
                plantLocation = remote.plantaNombre ?: "Planta registrada"
            )
        }
    }
}
