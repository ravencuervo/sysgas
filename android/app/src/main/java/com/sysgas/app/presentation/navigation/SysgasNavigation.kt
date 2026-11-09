package com.sysgas.app.presentation.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fireplace
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Scale
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.sysgas.app.presentation.common.SysgasTopBar
import com.sysgas.app.presentation.history.OrderHistoryScreen
import com.sysgas.app.presentation.home.HomeScreen
import com.sysgas.app.presentation.order.CheckoutScreen
import com.sysgas.app.presentation.scanner.PassportScannerScreen
import com.sysgas.app.presentation.tracking.OrderTrackingScreen
import com.sysgas.app.presentation.weight.CustomerWeightScreen
import com.sysgas.app.ui.theme.JadeDark
import com.sysgas.app.ui.theme.JadeDeep
import com.sysgas.app.ui.theme.JadeMint
import com.sysgas.app.ui.theme.JadePrimary

sealed class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
) {
    data object Home : BottomNavItem(SysgasScreen.Home.route, "Catálogo", Icons.Default.Fireplace)
    data object Tracking : BottomNavItem(SysgasScreen.Tracking.route, "Rastrear", Icons.Default.LocalShipping)
    data object Weight : BottomNavItem(SysgasScreen.Weight.route, "Balanza", Icons.Default.Scale)
    data object Scanner : BottomNavItem(SysgasScreen.Scanner.route, "Pasaporte", Icons.Default.QrCodeScanner)
    data object History : BottomNavItem(SysgasScreen.History.route, "Historial", Icons.Default.History)
}

@Composable
fun SysgasNavigation() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomNavItems = listOf(
        BottomNavItem.Home,
        BottomNavItem.Tracking,
        BottomNavItem.Weight,
        BottomNavItem.Scanner,
        BottomNavItem.History
    )

    Scaffold(
        topBar = {
            SysgasTopBar(
                title = "SYSGAS Altiplano",
                subtitle = "Puno & Juliaca · Pedido Seguro"
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                tonalElevation = 8.dp
            ) {
                bottomNavItems.forEach { item ->
                    val isSelected = currentRoute == item.route
                    NavigationBarItem(
                        selected = isSelected,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = item.title,
                                tint = if (isSelected) JadePrimary else Color.Gray
                            )
                        },
                        label = {
                            Text(
                                text = item.title,
                                style = androidx.compose.material3.MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    fontSize = 11.sp,
                                    color = if (isSelected) JadeDark else Color.Gray
                                )
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = JadeMint
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = SysgasScreen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(SysgasScreen.Home.route) {
                HomeScreen(
                    onNavigateToCheckout = { capacity ->
                        navController.navigate(SysgasScreen.Checkout.createRoute(capacity))
                    },
                    onNavigateToTracking = {
                        navController.navigate(SysgasScreen.Tracking.route)
                    }
                )
            }

            composable(
                route = SysgasScreen.Checkout.route,
                arguments = listOf(navArgument("capacity") { type = NavType.StringType; defaultValue = "10 kg" })
            ) { backStackEntry ->
                val capacity = backStackEntry.arguments?.getString("capacity") ?: "10 kg"
                CheckoutScreen(
                    capacity = capacity,
                    onOrderPlaced = { _ ->
                        navController.navigate(SysgasScreen.Tracking.route) {
                            popUpTo(SysgasScreen.Home.route)
                        }
                    },
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(SysgasScreen.Tracking.route) {
                OrderTrackingScreen(
                    onNavigateToWeight = {
                        navController.navigate(SysgasScreen.Weight.route)
                    }
                )
            }

            composable(SysgasScreen.Weight.route) {
                CustomerWeightScreen(
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }

            composable(SysgasScreen.Scanner.route) {
                PassportScannerScreen()
            }

            composable(SysgasScreen.History.route) {
                OrderHistoryScreen(
                    onReorder = { capacity ->
                        navController.navigate(SysgasScreen.Checkout.createRoute(capacity))
                    }
                )
            }
        }
    }
}
