package com.sysgas.app.presentation.navigation

sealed class SysgasScreen(val route: String, val title: String) {
    data object Home : SysgasScreen("home", "Catálogo")
    data object Checkout : SysgasScreen("checkout/{capacity}", "Confirmar Pedido") {
        fun createRoute(capacity: String) = "checkout/$capacity"
    }
    data object Tracking : SysgasScreen("tracking", "Rastreo GPS")
    data object Weight : SysgasScreen("weight", "Balanza")
    data object Scanner : SysgasScreen("scanner", "Pasaporte QR")
    data object History : SysgasScreen("history", "Historial")
}

