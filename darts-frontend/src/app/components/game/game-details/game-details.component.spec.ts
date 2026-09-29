import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { DetailedGame, Status } from '../../../models/game.models';
import { GameService } from '../../../services/game.service';
import { I18nService } from '../../../services/i18n.service';
import { OverviewTabService } from '../../../services/overview-tab.service';
import { TeamService } from '../../../services/team.service';
import { DartboardThrow } from '../dartboard/dartboard.component';
import { GameDetailsComponent } from './game-details.component';

type TestableGameDetails = {
  dartboardHitMarkers: ReadonlyArray<{
    x: number;
    y: number;
    throwIndex: number;
  }>;
  game: DetailedGame | null;
  inputMethod: 'dartboard' | 'scorePad';
  teamsById: Map<string, { _id: string; name: string; players: string[] }>;
  displayedPlayerNameForTeam(teamId: string): string;
  firstToText(legsToWin: number): string;
  isDisplayedTurnTeam(teamId: string): boolean;
  scoreShownForTeam(teamId: string): number;
  onDartboardThrowRecorded(hit: DartboardThrow): void;
  onPrimaryClick(): void;
  onSecondaryClick(): void;
  onThrowRecorded(score: number): void;
};

describe('GameDetailsComponent', () => {
  let gameService: jasmine.SpyObj<GameService>;
  let component: TestableGameDetails;

  beforeEach(async () => {
    gameService = jasmine.createSpyObj<GameService>('GameService', [
      'advanceTurn',
      'findById',
      'recordThrow',
      'rewindTurn',
      'rollbackThrow',
    ]);
    gameService.findById.and.returnValue(of(createGame()));

    await TestBed.configureTestingModule({
      imports: [GameDetailsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'game' })) },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy() } },
        { provide: GameService, useValue: gameService },
        { provide: TeamService, useValue: { findManyByIds: () => of([]) } },
        { provide: OverviewTabService, useValue: { setSelectedTab: () => {} } },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(GameDetailsComponent);
    component = fixture.componentInstance as unknown as TestableGameDetails;
    fixture.detectChanges();
  });

  it('keeps an earlier board marker when a score-pad throw is rolled back', () => {
    gameService.recordThrow.and.returnValues(
      of(
        createGame({
          firstTeamThrows: [20],
          rollbackThrow: true,
        }),
      ),
      of(
        createGame({
          firstTeamThrows: [20, 5],
          rollbackThrow: true,
        }),
      ),
    );
    gameService.rollbackThrow.and.returnValue(
      of(
        createGame({
          firstTeamThrows: [20],
          rollbackThrow: true,
        }),
      ),
    );

    component.onDartboardThrowRecorded({ score: 20, x: 100, y: 200 });
    component.onThrowRecorded(5);
    component.onSecondaryClick();

    expect(component.dartboardHitMarkers).toEqual([
      { x: 100, y: 200, throwIndex: 0 },
    ]);
  });

  it('defaults to dartboard input', () => {
    expect(component.inputMethod).toBe('dartboard');
  });

  it('removes the marker belonging to a rolled-back board throw', () => {
    gameService.recordThrow.and.returnValue(
      of(
        createGame({
          firstTeamThrows: [20],
          rollbackThrow: true,
        }),
      ),
    );
    gameService.rollbackThrow.and.returnValue(of(createGame()));

    component.onDartboardThrowRecorded({ score: 20, x: 100, y: 200 });
    component.onSecondaryClick();

    expect(component.dartboardHitMarkers).toEqual([]);
  });

  it('clears markers when a turn advances and does not restore them on rewind', () => {
    gameService.recordThrow.and.returnValue(
      of(
        createGame({
          firstTeamThrows: [20, 20, 20],
          recordThrow: false,
          rollbackThrow: true,
          advanceTurn: true,
        }),
      ),
    );
    gameService.advanceTurn.and.returnValue(
      of(
        createGame({
          firstTeamThrows: [20, 20, 20],
          teamIndex: 1,
          rewindTurn: true,
        }),
      ),
    );
    gameService.rewindTurn.and.returnValue(
      of(
        createGame({
          firstTeamThrows: [20, 20, 20],
          recordThrow: false,
          rollbackThrow: true,
          advanceTurn: true,
        }),
      ),
    );

    component.onDartboardThrowRecorded({ score: 20, x: 300, y: 400 });
    expect(component.dartboardHitMarkers.length).toBe(1);

    component.onPrimaryClick();
    expect(component.dartboardHitMarkers).toEqual([]);

    component.onSecondaryClick();
    expect(component.dartboardHitMarkers).toEqual([]);
  });

  it('keeps each score aligned with its player until that team starts a blank turn', () => {
    component.teamsById.set('team-a', {
      _id: 'team-a',
      name: 'Team A',
      players: ['Alice', 'Alex'],
    });
    component.teamsById.set('team-b', {
      _id: 'team-b',
      name: 'Team B',
      players: ['Bob', 'Bella'],
    });

    component.game = createGame({ teamIndex: 0, roundIndex: 0 });
    expect(component.displayedPlayerNameForTeam('team-a')).toBe('Alice');
    expect(component.displayedPlayerNameForTeam('team-b')).toBe('Bob');

    component.game = createGame({
      firstTeamThrows: [20, 20, 20],
      teamIndex: 1,
      roundIndex: 0,
    });
    expect(component.displayedPlayerNameForTeam('team-b')).toBe('Bob');
    expect(component.displayedPlayerNameForTeam('team-a')).toBe('Alice');

    const nextRound = createGame({ teamIndex: 0, roundIndex: 1 });
    nextRound.legs[0].teamData[0].throwsByRound = [[20, 20, 20], []];
    nextRound.legs[0].teamData[1].throwsByRound = [[10, 10, 10]];
    component.game = nextRound;

    expect(component.displayedPlayerNameForTeam('team-a')).toBe('Alex');
    expect(component.displayedPlayerNameForTeam('team-b')).toBe('Bob');
  });

  it('keeps points and the active highlight aligned when leg order swaps', () => {
    const game = createGame();
    game.scoreLimit = undefined;
    game.legs[0].teamData = [
      {
        teamId: 'team-b',
        throwsByRound: [[20]],
        turnOutcomesByRound: ['open'],
      },
      {
        teamId: 'team-a',
        throwsByRound: [[40]],
        turnOutcomesByRound: ['open'],
      },
    ];
    component.game = game;

    expect(component.scoreShownForTeam('team-a')).toBe(40);
    expect(component.scoreShownForTeam('team-b')).toBe(20);
    expect(component.isDisplayedTurnTeam('team-a')).toBeFalse();
    expect(component.isDisplayedTurnTeam('team-b')).toBeTrue();
  });

  it('uses singular and plural match-goal text', () => {
    expect(component.firstToText(1)).toBe('games.details.firstTo.one');
    expect(component.firstToText(2)).toBe('games.details.firstTo.many');
  });
});

function createGame(
  options: {
    firstTeamThrows?: number[];
    teamIndex?: number;
    roundIndex?: number;
    recordThrow?: boolean;
    rollbackThrow?: boolean;
    advanceTurn?: boolean;
    rewindTurn?: boolean;
  } = {},
): DetailedGame {
  const teamIndex = options.teamIndex ?? 0;
  const roundIndex = options.roundIndex ?? 0;
  return {
    _id: 'game',
    teamIds: ['team-a', 'team-b'],
    legs: [
      {
        _id: 'leg',
        teamData: [
          {
            teamId: 'team-a',
            throwsByRound: [options.firstTeamThrows ?? []],
            turnOutcomesByRound: ['open'],
          },
          {
            teamId: 'team-b',
            throwsByRound: [[]],
            turnOutcomesByRound: ['open'],
          },
        ],
        currentTeamIndex: teamIndex,
        currentRound: roundIndex + 1,
        roundLimit: 10,
        status: Status.ACTIVE,
      },
    ],
    legsToWin: 1,
    roundLimit: 10,
    scoreLimit: 501,
    status: Status.ACTIVE,
    locked: false,
    currentTurn: { legIndex: 0, teamIndex, roundIndex },
    allowedActions: {
      recordThrow: options.recordThrow ?? true,
      rollbackThrow: options.rollbackThrow ?? false,
      advanceTurn: options.advanceTurn ?? false,
      rewindTurn: options.rewindTurn ?? false,
    },
  };
}
