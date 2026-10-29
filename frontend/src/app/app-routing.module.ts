import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LivreManagerComponent } from './components/livre-manager/livre-manager.component';

const routes: Routes = [
  { path: 'livres', component: LivreManagerComponent },
  { path: '', redirectTo: 'livres', pathMatch: 'full' },
  { path: '**', redirectTo: 'livres' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
