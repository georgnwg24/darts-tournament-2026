import { Injectable } from '@angular/core';

export enum OverviewTab {
  Teams = 0,
  Games = 1,
  Tournaments = 2,
}

@Injectable({
  providedIn: 'root',
})
export class OverviewTabService {
  private selectedTab = OverviewTab.Games;

  getSelectedTab(): OverviewTab {
    return this.selectedTab;
  }

  setSelectedTab(tab: OverviewTab): void {
    this.selectedTab = tab;
  }
}
