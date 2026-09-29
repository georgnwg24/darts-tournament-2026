import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  CreateGameDto,
  DetailedGame,
  MinimalGame,
  RecordThrowDto,
} from '../models/game.models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private readonly gamesUrl = `/api/games`;

  constructor(private readonly http: HttpClient) {}

  create(createGameDto: CreateGameDto): Observable<MinimalGame> {
    return this.http.post<MinimalGame>(this.gamesUrl, createGameDto);
  }

  findById(id: string): Observable<DetailedGame> {
    const url = `${this.gamesUrl}/${id}`;
    return this.http.get<DetailedGame>(url);
  }

  findAllStandaloneGames(): Observable<MinimalGame[]> {
    return this.http.get<MinimalGame[]>(this.gamesUrl);
  }

  recordThrow(
    id: string,
    recordThrowDto: RecordThrowDto,
  ): Observable<DetailedGame> {
    const url = `${this.gamesUrl}/${id}/throws`;
    return this.http.post<DetailedGame>(url, recordThrowDto);
  }

  rollbackThrow(id: string): Observable<DetailedGame> {
    const url = `${this.gamesUrl}/${id}/rollback`;
    return this.http.post<DetailedGame>(url, {});
  }

  advanceTurn(id: string): Observable<DetailedGame> {
    const url = `${this.gamesUrl}/${id}/turns/advance`;
    return this.http.post<DetailedGame>(url, {});
  }

  rewindTurn(id: string): Observable<DetailedGame> {
    const url = `${this.gamesUrl}/${id}/turns/rewind`;
    return this.http.post<DetailedGame>(url, {});
  }

  delete(id: string): Observable<void> {
    const url = `${this.gamesUrl}/${id}`;
    return this.http.delete<void>(url);
  }
}
