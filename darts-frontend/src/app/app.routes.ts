import { Routes } from '@angular/router';
import { CreateGame } from './components/game/create-game/create-game.component';
import { GameDetailsComponent } from './components/game/game-details/game-details.component';
import { CreateEditTeamComponent } from './components/team/create-edit-team/create-edit-team.component';
import { OverviewTabsComponent } from './components/overview-tabs/overview-tabs.component';
import { CreateKoTournamentComponent } from './components/tournament/create-ko-tournament/create-ko-tournament.component';
import { CreateLeagueTournamentComponent } from './components/tournament/create-league-tournament/create-league-tournament.component';
import { TournamentDetailsComponent } from './components/tournament/tournament-details/tournament-details.component';

export const routes: Routes = [
    { path: '', component: OverviewTabsComponent },
    { path: 'teams/create', component: CreateEditTeamComponent},
    { path: 'teams/edit/:id', component: CreateEditTeamComponent},
    { path: 'games/create', component: CreateGame},
    { path: 'games/:id', component: GameDetailsComponent },
    { path: 'tournaments/ko/create', component: CreateKoTournamentComponent },
    { path: 'tournaments/league/create', component: CreateLeagueTournamentComponent },
    { path: 'tournaments/:id', component: TournamentDetailsComponent },
    { path: '**', redirectTo: '' },
];
