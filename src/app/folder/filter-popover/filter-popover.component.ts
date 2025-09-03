import { Component, Input, Output, EventEmitter } from '@angular/core';
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
    @Input() filterMode: 'all' | 'favorites' | 'any' = 'all';
    @Output() filterModeChange = new EventEmitter<'all' | 'favorites' | 'any'>();

    constructor(public popoverController: PopoverController) { }

    updateFilter(key: string, value: any) {
        this.filters[key] = value;
    }

    updateFilterMode(val: 'all' | 'favorites' | 'any') {
        this.filterMode = val;
        this.filterModeChange.emit(val);
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
