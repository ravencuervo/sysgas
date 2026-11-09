package com.sysgas.app.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class PassportData(
    val cylinderCode: String = "CIL-PU-10-84920",
    val capacity: String = "10 kg",
    val tareKg: Double = 11.50,
    val grossWeightExpectedKg: Double = 21.50,
    val netGasExpectedKg: Double = 10.00,
    val distributorName: String = "Distribuidora Altiplano Gas S.A.C.",
    val distributorRuc: String = "20608765431",
    val batchNumber: String = "LOTE-2026-10-PUN",
    val hydrostaticTestBar: Double = 14.7,
    val hydrostaticTestDate: String = "15/01/2026",
    val nextInspectionDate: String = "15/01/2031",
    val sealVerified: Boolean = true,
    val sealNumber: String = "SEC-882194-SYS",
    val status: String = "OPERATIVO Y SEGURO",
    val plantLocation: String = "Planta Envasadora Juliaca - Puno",
    val qrScanUrl: String = "https://sysgas.pe/pasaporte/CIL-PU-10-84920"
)
