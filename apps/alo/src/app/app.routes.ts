import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/order/order-page/order-page.component').then(m => m.OrderPageComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'ingredientes',
        loadComponent: () =>
          import('./features/admin/products/ingredientes-crud/ingredientes-crud.component').then(m => m.IngredientesCrudComponent)
      },
      {
        path: 'carnes',
        loadComponent: () =>
          import('./features/admin/products/carnes-crud/carnes-crud.component').then(m => m.CarnesCrudComponent)
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/admin/products/categorias-crud/categorias-crud.component').then(m => m.CategoriasCrudComponent)
      },
      {
        path: 'precios',
        loadComponent: () =>
          import('./features/admin/products/precios-crud/precios-crud.component').then(m => m.PreciosCrudComponent)
      },
      {
        path: 'populares',
        loadComponent: () =>
          import('./features/admin/products/populares-crud/populares-crud.component').then(m => m.PopularesCrudComponent)
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/admin/pedidos/pedidos.component').then(m => m.PedidosComponent)
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/admin/clientes/clientes.component').then(m => m.ClientesComponent)
      },
      {
        path: 'configuraciones',
        loadComponent: () =>
          import('./features/admin/configuraciones/configuraciones.component').then(m => m.ConfiguracionesComponent)
      },
      {
        path: 'visitas',
        loadComponent: () =>
          import('./features/admin/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      {
        path: 'imprimir-menu',
        loadComponent: () =>
          import('./features/admin/print-menu/print-menu.component').then(m => m.PrintMenuComponent)
      },
      {
        path: 'pos',
        loadComponent: () =>
          import('./features/admin/pos/pos.component').then(m => m.PosComponent)
      },
      {
        path: 'finanzas',
        loadComponent: () =>
          import('./features/admin/finanzas/finanzas.component').then(m => m.FinanzasComponent)
      },
      {
        path: 'empleados',
        loadComponent: () =>
          import('./features/admin/empleados/empleados.component').then(m => m.EmpleadosComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
