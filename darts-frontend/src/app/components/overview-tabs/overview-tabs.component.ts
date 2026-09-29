import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { GamesListComponent } from '../game/games-list/games-list.component';
import { TeamsListComponent } from '../team/teams-list/teams-list.component';
import { OverviewTab, OverviewTabService } from '../../services/overview-tab.service';
import { TournamentsListComponent } from '../tournament/tournaments-list/tournaments-list.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-overview-tabs',
  imports: [CommonModule, MatTabGroup, MatTab, NgComponentOutlet, TranslatePipe],
  templateUrl: './overview-tabs.component.html',
  styleUrl: './overview-tabs.component.scss',
})
export class OverviewTabsComponent {
  protected selectedTabIndex: OverviewTab;

  protected readonly teamsListComponent = TeamsListComponent;
  protected readonly gamesListComponent = GamesListComponent;
  protected readonly tournamentsListComponent = TournamentsListComponent;

  constructor(private overviewTabService: OverviewTabService) {
    this.selectedTabIndex = this.overviewTabService.getSelectedTab();
  }

  protected onTabChange(index: number): void {
    this.selectedTabIndex = index;
    this.overviewTabService.setSelectedTab(index as OverviewTab);
  }
}
