# Glossary

The ubiquitous language of Dart Counter. Code, docs and commits use these terms; UI labels map to them below.

## Core

| Term | Definition | UI (EN / FR) |
| --- | --- | --- |
| **Match** | The whole contest between players, from start to winner. | "match" / "match" |
| **Game mode** | The rule set a match is played with: X01, Cricket, Crazy Cricket, Around the Clock or Killer. | Game / Jeu |
| **Player** | A participant in a match (1 to 8). | Player / Joueur |
| **Team** | One or more players sharing one score in team play; members take turns. | Team / Équipe |
| **Side** | Who a score belongs to: a single player, or a team. The domain code calls sides "players" (`currentPlayer`, `playerCount`). | — |
| **Thrower** | The player throwing the current turn; in team play, the team member whose turn it is. | to throw / à lancer |
| **Turn** | One player's visit at the board: up to 3 darts. | — |
| **Round** | Every player has taken one turn. | Round / Tour |
| **Round limit** | The most rounds a match (an X01 leg) lasts; then the best-placed side wins. | Max rounds / Tours max |
| **Sudden death** | Extra rounds after the limit, one at a time, until one of the tied sides leads alone. | Sudden death / Mort subite |
| **Dart** | One throw: a segment and a multiplier. | Darts / Fléchettes |
| **Segment** | The number hit: 1–20, 25 for the bull, 0 for a miss. | — |
| **Multiplier** | Single (1), double (2) or triple (3). The bull has no triple. | Single, Double, Triple / Simple, Double, Triple |
| **Bull** | Segment 25. Outer bull is a single (25), bull's eye is a double (50). | Bull / Bull |
| **Miss** | A dart that scores nothing (segment 0). | Miss / Raté |
| **Current match** | The match being played, saved after every dart so it can be resumed. | — |
| **Match history** | The finished matches kept on the device, most recent first. | — |

## X01

| Term | Definition | UI (EN / FR) |
| --- | --- | --- |
| **Start score** | The score each player starts a leg from: 301, 501 or 701. | Start score / Score de départ |
| **Remaining** | Points a player still needs to finish the leg. | — |
| **Leg** | One countdown from the start score to zero. | Legs / **Manches** |
| **Set** | Won by winning a set number of legs. | Sets / Sets |
| **Leg starter** | The player who throws first in a leg; rotates every leg. | — |
| **Double in** | A player's score only starts counting once they hit a double. | Double in / Double pour entrer |
| **Double out** | A leg must be finished on a double. | Double out / Double pour finir |
| **Bust** | An invalid score (below zero, zero without a valid finish, or 1 with double out). The turn is cancelled and the remaining score restored. | BUST / BUST |
| **Checkout** | A suggested sequence of darts to finish the leg this turn. | Checkout / Finition |
| **3-dart average** | Points scored per 3 darts; busted darts count, their points do not. | Avg / Moy. |

> "Manches" is the French UI label for **Leg**, not for Set or Round.

## Cricket

| Term | Definition | UI (EN / FR) |
| --- | --- | --- |
| **Target** | A segment that counts in the match (six numbers plus the bull). | Shoot for / Visez |
| **Mark** | One hit on a target: a single is 1 mark, a double 2, a triple 3. | — |
| **Closed** | A target on which a player has 3 marks. | — |
| **Dead** | A target closed by every player; it no longer scores. | Dead / Mort |
| **Points** | Earned by marks beyond the third on a target an opponent has not closed. | Points / Points |
| **Target policy** | How a cricket match picks its targets: *fixed* (20–15 and the bull) or *reroll* (Crazy Cricket). | — |
| **Reroll** | Crazy Cricket: after a round, targets nobody hit are replaced from the pool; their marks are discarded. | CRAZY ROLL / ROULETTE FOLLE |

## Killer

| Term | Definition | UI (EN / FR) |
| --- | --- | --- |
| **Draw** | The opening phase: each side throws one dart for its number. | Throw for your number / Lancez pour tirer votre numéro |
| **Number** | A side's own segment, 1–20, from the draw. | — |
| **Lives** | What a side starts with (1–5); losing the last one knocks it out. | Lives / Vies |
| **Killer** | A side that has hit its own double; only killers take lives. | KILLER / KILLER |
| **Knockout** | A side losing its last life. | Out, Knockouts / Éliminé, Éliminations |

## Avoid

| Don't say | Say |
| --- | --- |
| game (for the contest) | match |
| visit, throw (for 3 darts) | turn |
| manche (in code or docs) | leg |
| number (in cricket) | target |
