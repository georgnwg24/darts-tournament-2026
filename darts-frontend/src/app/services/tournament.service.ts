import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateKoTournamentDto,
  CreateLeagueTournamentDto,
  LeagueStanding,
  Tournament,
} from '../models/tournament.models';

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private readonly tournamentsUrl = '/api/tournaments';

  constructor(private readonly http: HttpClient) {}

  createKo(dto: CreateKoTournamentDto): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.tournamentsUrl}/ko`, dto);
  }

  createLeague(dto: CreateLeagueTournamentDto): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.tournamentsUrl}/league`, dto);
  }

  findAll(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(this.tournamentsUrl);
  }

  findById(id: string): Observable<Tournament> {
    return this.http.get<Tournament>(`${this.tournamentsUrl}/${id}`);
  }

  getLeagueStandings(id: string): Observable<LeagueStanding[]> {
    return this.http.get<LeagueStanding[]>(
      `${this.tournamentsUrl}/${id}/standings`,
    );
  }

  advance(id: string): Observable<Tournament> {
    return this.http.post<Tournament>(
      `${this.tournamentsUrl}/${id}/advance`,
      {},
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.tournamentsUrl}/${id}`);
  }
}
