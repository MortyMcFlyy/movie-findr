import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VibesearchingPageRoutingModule } from './vibesearching-routing.module';

import { VibesearchingPage } from './vibesearching.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VibesearchingPageRoutingModule
  ],
  declarations: [VibesearchingPage]
})
export class VibesearchingPageModule {}
