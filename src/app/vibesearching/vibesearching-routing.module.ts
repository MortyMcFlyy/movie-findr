import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VibesearchingPage } from './vibesearching.page';

const routes: Routes = [
  {
    path: '',
    component: VibesearchingPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VibesearchingPageRoutingModule {}
