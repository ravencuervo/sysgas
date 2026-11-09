package com.sysgas.app.data.repository

import com.sysgas.app.domain.model.TruckLocation
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class TrackingRepository {

    fun observeTruckLocation(orderId: String): Flow<TruckLocation> = flow {
        var eta = 14
        var distance = 1.8
        var lat = -15.8345
        var lng = -70.0260

        // Puntos de referencia geográficos reales en Puno (Bajando hacia Jr. Arequipa)
        val destLat = -15.8402
        val destLng = -70.0219

        while (true) {
            emit(
                TruckLocation(
                    orderId = orderId,
                    driverName = "Ramiro Quispe Condori",
                    driverPhone = "+51951667696",
                    plateNumber = "V8X-721",
                    truckModel = "Hino Dutro City 4T - Flota Altiplano",
                    currentLat = lat,
                    currentLng = lng,
                    destinationLat = destLat,
                    destinationLng = destLng,
                    etaMinutes = eta.coerceAtLeast(1),
                    distanceKm = distance.coerceAtLeast(0.1),
                    speedKmH = if (eta > 1) 28.5 else 10.0,
                    lastUpdateIso = "En tiempo real GPS"
                )
            )

            delay(4000)

            // Simulación de aproximación del camión repartidor
            if (eta > 1) {
                eta -= 1
                distance = (distance - 0.15).coerceAtLeast(0.1)
                lat += (destLat - lat) * 0.15
                lng += (destLng - lng) * 0.15
            }
        }
    }
}
