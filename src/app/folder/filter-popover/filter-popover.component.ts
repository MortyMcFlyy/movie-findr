import { Component, Input } from '@angular/core';
import { PopoverController, IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-filter-popover',
    templateUrl: './filter-popover.component.html',
    styleUrls: ['./filter-popover.component.scss'],
    standalone: true,
    imports: [
        IonicModule
    ],
})
export class FilterPopoverComponent {
    @Input() filters: any = {};

    constructor(public popoverController: PopoverController) { }

    updateFilter(key: string, value: any) {
        this.filters[key] = value;
    }

    resetAllFilters() {
        for (const key in this.filters) {
            delete this.filters[key];
        }
        this.popoverController.dismiss();
    }


    clearSingleFilter(key: string) {
        delete this.filters[key];
    }
}
