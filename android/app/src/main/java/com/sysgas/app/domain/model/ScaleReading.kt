package com.sysgas.app.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class ScaleReading(
    val grossWeightKg: Double = 21.52,
    val tareKg: Double = 11.50,
    val netGasKg: Double = 10.02,
    val expectedNetKg: Double = 10.00,
    val toleranceAllowedKg: Double = 0.10,
    val isExact: Boolean = true,
    val isConnectedBluetooth: Boolean = true,
    val scaleDeviceName: String = "SYSGAS-SCALE-BT04 (Calibrada INACAL)",
    val scaleBatteryPct: Int = 94,
    val timestamp: String = "10:42 AM"
) {
    val differenceKg: Double
        get() = netGasKg - expectedNetKg

    val statusMessage: String
        get() = if (isExact) {
            "✓ PESO CERTIFICADO EXACTO (Gas neto %.2f kg)".format(netGasKg)
        } else {
            "⚠ MERMA DETECTADA (Faltan %.2f kg)".format(-differenceKg)
        }
}

