import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Observable, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CurrentTurn,
  DetailedGame,
  RecordThrowDto,
  Status,
} from '../../../models/game.models';
import { Leg } from '../../../models/leg.models';
import { Team } from '../../../models/team.model';

import { GameService } from '../../../services/game.service';
import { TeamService } from '../../../services/team.service';
import {
  OverviewTab,
  OverviewTabService,
} from '../../../services/overview-tab.service';

import {
  DartboardComponent,
  DartboardPoint,
  DartboardThrow,
} from '../dartboard/dartboard.component';
import { ScorePadComponent } from '../score-pad/score-pad.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  MatButtonToggleChange,
  MatButtonToggleModule,
} from '@angular/material/button-toggle';
import { I18nService } from '../../../services/i18n.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { findCheckoutPath } from '../../../utils/checkout.utils';

interface TurnHitMarker extends DartboardPoint {
  throwIndex: number;
}

@Component({
  selector: 'app-game-details',
  standalone: true,
  imports: [
    DartboardComponent,
    ScorePadComponent,
    MatButtonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatIconModule,
    MatButtonToggleModule,
    TranslatePipe,
  ],
  templateUrl: './game-details.component.html',
  styleUrl: './game-details.component.scss',
})
export class GameDetailsComponent implements OnInit {
  protected game: DetailedGame | null = null;
  protected gameId: string | null = null;
  protected teamsById = new Map<string, Team>();
  protected readonly threeSlots = [0, 1, 2];
  protected inputMethod: 'dartboard' | 'scorePad' = 'dartboard';
  protected showFinishedView = false;
  protected dartboardHitMarkers: readonly TurnHitMarker[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private hitMarkerTurnKey: string | null = null;
  private gameUpdatePending = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
    private readonly overviewTabService: OverviewTabService,
    private readonly i18nService: I18nService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((pm) => {
          const id = pm.get('id');
          this.gameId = id;
          if (!id) throw new Error('Missing game id route param');
          return this.gameService.findById(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (g) => this.applyNewGame(g, true),
        error: () => {
          this.game = null;
        },
      });
  }

  protected onInputMethodChange(event: MatButtonToggleChange): void {
    this.inputMethod = event.value as 'dartboard' | 'scorePad';
  }

  protected get isLoaded(): boolean {
    return !!this.game && !!this.game.currentTurn;
  }

  protected get displayedTurn(): CurrentTurn | null {
    return this.game?.currentTurn ?? null;
  }

  protected get displayedLeg(): Leg | null {
    const g = this.game;
    const t = this.displayedTurn;
    if (!g || !t) return null;
    return g.legs[t.legIndex] ?? null;
  }

  protected get isGameFinished(): boolean {
    return !!this.game && this.game.status === Status.COMPLETE;
  }

  protected get isGameLocked(): boolean {
    return !!this.game?.locked;
  }

  protected totalLegWinsForTeam(teamId: string): number {
    return (
      this.game?.legs?.filter(
        (l) => l.status === Status.COMPLETE && l.legWinner === teamId,
      ).length ?? 0
    );
  }

  protected countLegWinsForTeam(teamId: string): number {
    const g = this.game;
    const t = this.displayedTurn;
    if (!g?.legs?.length || !t) return 0;
    return g.legs
      .slice(0, Math.max(0, t.legIndex))
      .filter((l) => l.status === Status.COMPLETE && l.legWinner === teamId)
      .length;
  }

  protected get displayedTeamId(): string | null {
    const leg = this.displayedLeg;
    const t = this.displayedTurn;
    if (!leg || !t) return null;
    return leg.teamData[t.teamIndex]?.teamId ?? null;
  }

  protected isDisplayedTurnTeam(teamId: string): boolean {
    return this.displayedTeamId === teamId;
  }

  protected teamName(teamId: string | null): string {
    if (!teamId) return this.i18nService.t('common.unknownTeam');
    return (
      this.teamsById.get(teamId)?.name ??
      this.i18nService.t('common.unknownTeam')
    );
  }

  protected get displayedThrows(): number[] {
    const leg = this.displayedLeg;
    const t = this.displayedTurn;
    if (!leg || !t) return [];
    return leg.teamData[t.teamIndex]?.throwsByRound?.[t.roundIndex] ?? [];
  }

  protected isBustThrow(index: number): boolean {
    const leg = this.displayedLeg;
    const t = this.displayedTurn;
    if (!leg || !t) return false;

    const outcome =
      leg.teamData[t.teamIndex]?.turnOutcomesByRound?.[t.roundIndex];
    return outcome === 'bust' && index === this.displayedThrows.length - 1;
  }

  protected get displayedThrowCount(): number {
    return this.displayedThrows.length;
  }

  protected get canRecordThrow(): boolean {
    return !this.gameUpdatePending && !!this.game?.allowedActions?.recordThrow;
  }

  protected get primaryLabel(): string {
    if (this.showFinishedView) {
      return this.game?.tournamentId
        ? this.i18nService.t('games.details.goToTournament')
        : this.i18nService.t('games.details.backToGames');
    }
    if (this.isGameFinished)
      return this.i18nService.t('games.details.finishGame');
    if (this.displayedLeg?.status === Status.COMPLETE)
      return this.i18nService.t('games.details.nextLeg');
    return this.i18nService.t('games.details.finishTurn');
  }

  protected get isPrimaryDisabled(): boolean {
    if (!this.isLoaded || this.gameUpdatePending) return true;
    if (this.isGameFinished) return false;
    return !this.game?.allowedActions?.advanceTurn;
  }

  protected get secondaryLabel(): string {
    if (!this.isLoaded) return this.i18nService.t('common.back');
    if (this.showFinishedView)
      return this.i18nService.t('games.details.backToMatchView');
    if (this.game?.allowedActions?.rollbackThrow)
      return this.i18nService.t('games.details.rollback');
    return this.i18nService.t('common.back');
  }

  protected get isSecondaryDisabled(): boolean {
    if (!this.isLoaded || !this.gameId || this.gameUpdatePending) return true;
    if (this.showFinishedView) return false;
    return !(
      this.game?.allowedActions?.rollbackThrow ||
      this.game?.allowedActions?.rewindTurn
    );
  }

  protected get gameOutcomeText(): string {
    const winner = this.game?.gameWinner;
    return winner
      ? this.i18nService.t('games.details.wonOutcome', {
          team: this.teamName(winner),
        })
      : '';
  }

  protected legWinnerName(leg: Leg): string {
    return leg.legWinner ? this.teamName(leg.legWinner) : '';
  }

  protected roundProgressText(leg: Leg): string {
    if (leg.currentRound > leg.roundLimit) {
      return this.i18nService.t('games.details.overtimeRound', {
        round: leg.currentRound - leg.roundLimit,
      });
    }

    return this.i18nService.t('games.details.regulationRound', {
      current: leg.currentRound,
      total: leg.roundLimit,
    });
  }

  protected firstToText(legsToWin: number): string {
    const key =
      legsToWin === 1
        ? 'games.details.firstTo.one'
        : 'games.details.firstTo.many';
    return this.i18nService.t(key, { count: legsToWin });
  }

  protected scoreShownForTeam(teamId: string): number {
    const g = this.game;
    const leg = this.displayedLeg;
    if (!g || !leg) return 0;

    const total = this.legScoreForTeamById(leg, teamId);
    if (g.scoreLimit !== undefined && g.scoreLimit !== null) {
      return Math.max(0, g.scoreLimit - total);
    }
    return total;
  }

  protected displayedPlayerNameForTeam(teamId: string): string {
    const t = this.displayedTurn;
    const leg = this.displayedLeg;
    const teamIndex = leg?.teamData.findIndex(
      (teamData) => teamData.teamId === teamId,
    );
    if (!t || !leg || teamIndex === undefined || teamIndex < 0) return '';

    const team = this.teamsById.get(teamId);
    if (!team?.players?.length) return '';

    const throwsByRound = leg.teamData[teamIndex].throwsByRound ?? [];
    const currentTurnIsBlank =
      teamIndex === t.teamIndex &&
      (throwsByRound[t.roundIndex]?.length ?? 0) === 0;
    let playerRoundIndex = t.roundIndex;

    if (!currentTurnIsBlank) {
      for (
        let roundIndex = throwsByRound.length - 1;
        roundIndex >= 0;
        roundIndex--
      ) {
        if (throwsByRound[roundIndex]?.length) {
          playerRoundIndex = roundIndex;
          break;
        }
      }
    }

    const playerIndex = (t.legIndex + playerRoundIndex) % team.players.length;
    return team.players[playerIndex] ?? '';
  }

  protected get finishPathText(): string | null {
    const path = this.finishPath;
    return path?.length ? [...path].reverse().join(' · ') : null;
  }

  private get finishPath(): string[] | null {
    const g = this.game;
    const leg = this.displayedLeg;
    const turn = this.displayedTurn;
    if (!g?.scoreLimit || !leg || !turn || leg.status === Status.COMPLETE)
      return null;

    const currentScore = this.legScoreForTeamByIndex(leg, turn.teamIndex);
    const remaining = g.scoreLimit - currentScore;
    const dartsLeft = Math.max(0, 3 - this.displayedThrowCount);
    return findCheckoutPath(remaining, dartsLeft);
  }

  protected onThrowRecorded(score: number): void {
    this.recordThrow(score);
  }

  protected onDartboardThrowRecorded(hit: DartboardThrow): void {
    this.recordThrow(hit.score, hit);
  }

  private recordThrow(score: number, hit?: DartboardPoint): void {
    if (!this.gameId || !this.canRecordThrow) return;

    const teamId = this.displayedTeamId;
    if (!teamId) return;

    const turnKey = this.currentTurnKey(this.game);
    const dto: RecordThrowDto = { teamId, score };
    this.applyGameUpdate(
      this.gameService.recordThrow(this.gameId, dto),
      (updatedGame) => {
        if (!hit || this.currentTurnKey(updatedGame) !== turnKey) return;

        const throwIndex = this.throwCountForCurrentTurn(updatedGame) - 1;
        if (throwIndex < 0) return;

        this.dartboardHitMarkers = [
          ...this.dartboardHitMarkers,
          { ...hit, throwIndex },
        ];
      },
    );
  }

  protected onPrimaryClick(): void {
    if (!this.gameId || !this.isLoaded || this.gameUpdatePending) return;

    if (this.showFinishedView) {
      this.onBackToGamesTable();
      return;
    }

    if (this.isGameFinished) {
      this.showFinishedView = true;
      return;
    }

    if (!this.game?.allowedActions?.advanceTurn) return;
    this.applyGameUpdate(this.gameService.advanceTurn(this.gameId));
  }

  protected onSecondaryClick(): void {
    if (!this.gameId || !this.isLoaded || this.gameUpdatePending) return;

    if (this.showFinishedView) {
      this.showFinishedView = false;
      return;
    }

    if (this.game?.allowedActions?.rollbackThrow) {
      this.applyGameUpdate(this.gameService.rollbackThrow(this.gameId));
      return;
    }

    if (this.game?.allowedActions?.rewindTurn) {
      this.applyGameUpdate(this.gameService.rewindTurn(this.gameId));
    }
  }

  onBackToGamesTable(): void {
    if (this.game?.tournamentId) {
      this.overviewTabService.setSelectedTab(OverviewTab.Tournaments);
      this.router.navigate(['/tournaments', this.game.tournamentId]);
      return;
    }

    this.overviewTabService.setSelectedTab(OverviewTab.Games);
    this.router.navigate(['/']);
  }

  private applyNewGame(newGame: DetailedGame, initialLoad: boolean): void {
    this.reconcileHitMarkers(newGame);
    this.game = newGame;
    if (initialLoad)
      this.showFinishedView = this.game.status === Status.COMPLETE;

    const ids = newGame.teamIds ?? [];
    const missing = ids.filter((id) => !this.teamsById.has(id));
    if (missing.length === 0) return;

    this.teamService
      .findManyByIds(missing)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((teams) => {
        for (const team of teams) this.teamsById.set(team._id, team);
      });
  }

  private applyGameUpdate(
    request: Observable<DetailedGame>,
    afterUpdate?: (game: DetailedGame) => void,
  ): void {
    if (this.gameUpdatePending) return;
    this.gameUpdatePending = true;

    request
      .pipe(
        finalize(() => (this.gameUpdatePending = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((game) => {
        this.applyNewGame(game, false);
        afterUpdate?.(game);
      });
  }

  private reconcileHitMarkers(game: DetailedGame): void {
    const turnKey = this.currentTurnKey(game);
    if (turnKey !== this.hitMarkerTurnKey) {
      this.dartboardHitMarkers = [];
      this.hitMarkerTurnKey = turnKey;
      return;
    }

    const throwCount = this.throwCountForCurrentTurn(game);
    this.dartboardHitMarkers = this.dartboardHitMarkers.filter(
      (marker) => marker.throwIndex < throwCount,
    );
  }

  private currentTurnKey(game: DetailedGame | null): string | null {
    const turn = game?.currentTurn;
    const leg = turn ? game.legs[turn.legIndex] : undefined;
    const team = turn ? leg?.teamData[turn.teamIndex] : undefined;
    if (!game || !turn || !leg || !team) return null;

    return [
      game._id,
      leg._id,
      turn.teamIndex,
      team.teamId,
      turn.roundIndex,
    ].join(':');
  }

  private throwCountForCurrentTurn(game: DetailedGame): number {
    const turn = game.currentTurn;
    return (
      game.legs[turn.legIndex]?.teamData[turn.teamIndex]?.throwsByRound?.[
        turn.roundIndex
      ]?.length ?? 0
    );
  }

  protected legScoreForTeamByIndex(leg: Leg, teamIndex: number): number {
    return (leg.teamData?.[teamIndex]?.throwsByRound ?? [])
      .flat()
      .reduce((sum, v) => sum + v, 0);
  }

  legScoreForTeamById(leg: Leg, teamId: string): number {
    const team = leg.teamData?.find((td) => td.teamId === teamId);
    return (team?.throwsByRound ?? []).flat().reduce((sum, v) => sum + v, 0);
  }
}
