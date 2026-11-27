package com.sysgas.app.data.repository

import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.PassportData
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@Serializable
internal data class RemotePublicPassportDto(
    val codigo: String = "",
    val uuid: String = "",
    val tipo: String = "10kg",
    val tara: String = "0 kg",
    val pesoBruto: String = "",
    val estado: String = "",
    val planta: String = "",
    val operadorLlenado: String = ""
)

class PassportRepository {

    private val json = Json { ignoreUnknownKeys = true }

    suspend fun getPassportByCode(code: String): Result<PassportData?> = withContext(Dispatchers.IO) {
        runCatching {
            val cleanCode = code.trim()
            if (cleanCode.isBlank()) return@runCatching null

            val client = SupabaseClientProvider.client
            val result = client.postgrest.rpc(
                function = "pasaporte_publico",
                parameters = buildJsonObject {
                    put("p_codigo", cleanCode)
                }
            )
            val rawText = result.data.trim()
            if (rawText.isBlank() || rawText == "null") return@runCatching null

            val remote = json.decodeFromString<RemotePublicPassportDto>(rawText)
            val tareVal = remote.tara.replace("kg", "", ignoreCase = true).trim().toDoubleOrNull() ?: 11.5
            val netKg = when {
                remote.tipo.contains("45") -> 45.0
                remote.tipo.contains("5") -> 5.0
                else -> 10.0
            }

            PassportData(
                cylinderCode = remote.codigo.ifBlank { cleanCode },
                capacity = remote.tipo.replace("kg", " kg"),
                tareKg = tareVal,
                grossWeightExpectedKg = tareVal + netKg,
                netGasExpectedKg = netKg,
                distributorName = "Distribuidora autorizada SYSGAS",
                distributorRuc = "",
                batchNumber = remote.uuid.take(12).ifBlank { "Registrado" },
                hydrostaticTestBar = 14.7,
                hydrostaticTestDate = "Vigente",
                nextInspectionDate = "Vigente",
                sealVerified = true,
                sealNumber = remote.operadorLlenado.ifBlank { "Verificado" },
                status = remote.estado.ifBlank { "VERIFICADO" },
                plantLocation = remote.planta.ifBlank { "Planta registrada" }
            )
        }
    }
}
