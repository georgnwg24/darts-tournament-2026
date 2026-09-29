import {
  AbstractControl,
  FormArray,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Team } from '../models/team.model';

export type TeamInput = string | Team | null;

export function filterTeams(
  teams: Team[],
  value: TeamInput,
  trim = false,
): Team[] {
  const term = typeof value === 'string' ? value : (value?.name ?? '');
  const normalizedTerm = trim ? term.toLowerCase().trim() : term.toLowerCase();

  return teams.filter(
    (team) =>
      team.name.toLowerCase().includes(normalizedTerm) ||
      team.players.some((player) =>
        player.toLowerCase().includes(normalizedTerm),
      ),
  );
}

export function minimumStringSelections(minimum: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = (control.value as string[] | null) ?? [];
    return values.length >= minimum ? null : { insufficientTeams: true };
  };
}

export function validTeamSelection(getTeams: () => Team[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as TeamInput;
    if (!value) return null;
    if (typeof value === 'string') return { invalidTeamSelection: true };
    return getTeams().some((team) => team._id === value._id)
      ? null
      : { invalidTeamSelection: true };
  };
}

export function minimumTeamSlots(minimum: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const selectedCount = (control as FormArray).controls.filter((slot) =>
      Boolean(slot.value),
    ).length;
    return selectedCount >= minimum ? null : { insufficientTeams: true };
  };
}

export const uniqueTeamSlots: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const selectedIds = (control as FormArray).controls
    .map((slot) => (slot.value as Team | null)?._id)
    .filter((teamId): teamId is string => teamId !== undefined);

  return new Set(selectedIds).size === selectedIds.length
    ? null
    : { duplicateTeams: true };
};
