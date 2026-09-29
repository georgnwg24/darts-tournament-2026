# Darts Tournament User Guide

This application helps tournament organizers manage teams, play individual darts games and run league or knockout tournaments. The main page is divided into **Teams**, **Games** and **Tournaments** tabs.

Use the language dropdown at the top of the page to switch between **EN** and **DE**. Your choice is remembered in this browser. Button names in this guide use the English interface.

## 1. Create your teams

Create the participating teams before setting up games or tournaments.

1. Open the **Teams** tab.
2. Select the add-team button.
3. Enter a team name (up to 30 characters) and the names of both players (up to 20 characters each).
4. Select **Create**.

The two players in a team must have different names. From the team list, use the edit button and then **Update** to change a team  or the delete button to remove it. You will be asked to confirm before a team is deleted.

## 2. Create a standalone game

Use a standalone game for a match that is not part of a tournament.

1. Open the **Games** tab.
2. Select the add-game button.
3. Choose two different teams as the starting team and opposing team. You can type to filter the choices; select each team from the suggestions.
4. Configure the game:
   - **Legs to win** determines how many legs a team must win to take the game.
   - **Regulation rounds** determines when the teams' scores are compared. If they are tied, complete overtime rounds continue until one team leads.
   - **Score limit** is an optional exact target. Reaching it wins the leg immediately. Leave it empty to play for the highest score.
5. Select **Create**.

The Games tab lists standalone games; open tournament matches from their tournament. Games are shown as either active or complete. Select a game card to open it  or use its delete button to remove it after confirming.

## 3. Record a game

The game screen shows the teams, leg score, player names above their teams' points, the current round and the throws in the current turn. A name remains aligned with the points that player most recently scored; when the active team's new turn is blank, its current player is shown instead. Point columns stay aligned with the same teams when a new leg changes which team throws first.

Each turn allows up to three darts. Teams take turns and the two players within each team alternate between rounds. The starting team and starting player change with each new leg.

1. Use the default **Dartboard** input method or choose **Score pad**.
2. Record each dart:
   - On the score pad, select **Double** or **Triple** before the number when needed. The resulting score appears in parentheses and the multiplier resets after each dart. Select the active multiplier again to cancel it. Use **25** for the outer bull, **Double** then **25** for the inner bull (50)  or **0** for a miss with no multiplier selected.
   - On the dartboard, select the section that was hit. The black outer area and number labels record a miss (0). Markers show where you clicked during the current turn; they clear when you change turns or reload the page.
3. After three darts  or a bust, select **Finish Turn**. If the leg has ended, the button instead offers **Next Leg** or **Finish Game**.
4. Continue until a team wins the leg. Select **Next Leg** when prompted.
5. When a team has won the required number of legs, select **Finish Game** to view the result and leg overview.

When an exact score limit is used, the displayed score counts down toward zero. Reaching zero wins immediately; no double finish is required. If neither team reaches zero, regulation rounds still apply: the team with the lower remaining score wins once both turns in the final regulation round are complete. A tie starts overtime.

The application may suggest a path to finish using the darts left in the turn. In these suggestions, singles appear as plain numbers, doubles and triples use `D` and `T` prefixes and `SB` and `DB` mean outer bull (25) and inner bull (50).

Exceeding the target is a **Bust**: the whole turn scores zero, the score returns to its value at the start of the turn and no more darts can be entered for that turn.

Use **Rollback** to remove the most recent throw, including a bust or winning dart. Once the current turn is empty, **Back** returns to the previous turn; at the start of a new leg it can return to the previous leg.

On the result screen, **Back to Match View** lets you return to scoring and correct an unlocked game. Select **Go to Tournament** for tournament games or **Back to Games** for standalone games to leave the result screen. Tournament games can only be corrected while their stage or matchday is still active.

## 4. Create a knockout tournament

1. Open the **Tournaments** tab.
2. Select the add-tournament button, then **Create KO Tournament**.
3. Enter a tournament name and choose **Quarter Finals** (eight slots) or **Semi Finals** (four slots) as the starting stage.
4. Optionally enable a third-place match.
5. Assign at least two different teams to the starting slots. A team cannot occupy more than one slot.
6. Set the game rules for each stage.
7. Select **Create KO Tournament**.

Open the tournament and select a match in the active stage to play it. Once every match in that stage is resolved, select **Advance to Next Stage**. If enabled, the third-place match is played after the semifinals and before the final. Repeat this process through the final, then select **Finish Tournament**. Completed tournaments show the final placements and, when applicable, third place.

Empty slots can produce automatic walkovers, so not every bracket position necessarily requires a game.

## 5. Create a league tournament

1. Open the **Tournaments** tab.
2. Select the add-tournament button, then **Create League Tournament**.
3. Enter a tournament name.
4. Select at least two teams. Use **Select All** or **Select None** for quicker selection.
5. Choose how many games each team should play and set the game rules used by all league matches.
6. Select **Create League Tournament**.

Use a positive whole number for games per team. The number of teams multiplied by games per team must be even; with an odd number of teams, choose an even number of games per team. For example, five teams can play four games each, but not three. Choosing one fewer game per team than the number of teams gives a full round robin; larger values allow repeat pairings.

Open the tournament to see the league table and current matchday. Select a match on the active matchday to play it. After all matches on that matchday are complete, select **Conclude Matchday**. On the final matchday, select **Finish Tournament**.

Use the arrow buttons to review other matchdays. Only matches on the active matchday can be opened for play. The league table is ranked by points, then head-to-head results among teams tied on points, then average score per turn.

- **P** counts completed games.
- **Pts** awards one point per game won.
- **Avg/Turn** shows the average score per recorded turn, including turns in games still in progress.

## 6. Manage tournaments

The Tournaments tab separates active and complete tournaments. Select a tournament card to open its bracket, standings, matchdays and games.

Advancing a knockout stage or concluding a league matchday locks its games against further changes. Check results and make any corrections before advancing. Finishing the tournament also locks its final games. Completed tournaments offer **Return to Tournaments** to return to the list.

Use the delete button on a tournament card to remove the tournament and all of its games. The application asks for confirmation before doing so.
