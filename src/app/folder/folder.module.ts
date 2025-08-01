import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { FolderPageRoutingModule } from './folder-routing.module';

import { FolderPage } from './folder.page';
import { LazyLoadProvidersDirective } from '../shared/directives/lazy-load-providers.directive';
import { FilterPopoverComponent } from './filter-popover/filter-popover.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FolderPageRoutingModule,
    FilterPopoverComponent  // Move it here as an import
  ],
  declarations: [
    FolderPage,
    LazyLoadProvidersDirective  // Keep this here as it's not standalone
  ]
})
export class FolderPageModule {}
