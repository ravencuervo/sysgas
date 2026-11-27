package com.sysgas.app.data.repository

import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.domain.model.TruckLocation
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.isActive
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class RemoteOrderTrackingDto(
    val id: String,
    @SerialName("camion_id") val camionId: String? = null,
    @SerialName("tiempo_estimado_minutos") val tiempoEstimadoMinutos: Int? = null,
    @SerialName("latitud_entrega") val latitudEntrega: Double? = null,
    @SerialName("longitud_entrega") val longitudEntrega: Double? = null,
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
internal data class RemoteTruckDto(
    val id: String,
    val placa: String = "",
    val modelo: String = "",
    @SerialName("latitud_actual") val latitudActual: Double? = null,
    @SerialName("longitud_actual") val longitudActual: Double? = null
)

class TrackingRepository {

    fun observeTruckLocation(orderId: String): Flow<TruckLocation?> = flow {
        if (orderId.isBlank()) {
            emit(null)
            return@flow
        }

        val client = SupabaseClientProvider.client
        while (currentCoroutineContext().isActive) {
            val location = try {
                val order = client.from("pedidos")
                    .select {
                        filter { eq("id", orderId) }
                    }
                    .decodeSingleOrNull<RemoteOrderTrackingDto>()

                val truckId = order?.camionId
                val truck = if (!truckId.isNullOrBlank()) {
                    client.from("camiones_flota")
                        .select {
                            filter { eq("id", truckId) }
                        }
                        .decodeSingleOrNull<RemoteTruckDto>()
                } else null

                if (order != null && truck != null && truck.latitudActual != null && truck.longitudActual != null) {
                    TruckLocation(
                        orderId = order.id,
                        driverName = "Repartidor asignado",
                        driverPhone = "",
                        plateNumber = truck.placa,
                        truckModel = truck.modelo,
                        currentLat = truck.latitudActual,
                        currentLng = truck.longitudActual,
                        destinationLat = order.latitudEntrega ?: -15.8402,
                        destinationLng = order.longitudEntrega ?: -70.0219,
                        etaMinutes = order.tiempoEstimadoMinutos ?: 20,
                        distanceKm = 0.0,
                        speedKmH = 0.0,
                        lastUpdateIso = order.updatedAt.take(16).replace("T", " ")
                    )
                } else {
                    null
                }
            } catch (_: Exception) {
                null
            }
            emit(location)
            delay(10000)
        }
    }
}
