import { MapGenerationFunctions } from '../core/functions/map-generation';
import { GlobalTypes, Game } from '../core/global';

test('[createLine]: should add line to grid', () => {
    MapGenerationFunctions.createLine();
    expect(Game.grid).toStrictEqual([
        {
            id: 0,
            cases: [
                {
                    type: GlobalTypes.caseTypes.empty,
                },
                {
                    type: GlobalTypes.caseTypes.empty,
                },
                {
                    type: GlobalTypes.caseTypes.empty,
                },
            ],
        },
    ]);
    for (let i = 0; i < 50; i++) {
        MapGenerationFunctions.createLine();
    }
    let i = 0;
    for (const line of Game.grid) {
        expect(line.id).toBe(i);
        if (line.id <= 3 || line.id % 2 === 0) {
            expect(line.cases).toStrictEqual([
                {
                    type: GlobalTypes.caseTypes.empty,
                },
                {
                    type: GlobalTypes.caseTypes.empty,
                },
                {
                    type: GlobalTypes.caseTypes.empty,
                },
            ]);
        } else {
            if (line.cases.includes(GlobalTypes.caseTypes.obstacle)) {
                expect(line.cases.includes(GlobalTypes.caseTypes.empty)).toBe(true);
            }
        }
        i++;
    }
    expect(Game.grid.length).toBe(51);
});

// La grille compte 8 lignes depuis que le jeu a grandi (5 au départ) ; tests remis à jour en 2026.
test('[deleteFirstLine]: should delete first line of grid', () => {
    Game.grid = [];
    MapGenerationFunctions.createGrid();
    Game.player.position.y = -1;
    MapGenerationFunctions.deleteFirstLine();
    expect(Game.grid.length).toBe(7);
});

test('[deleteFirstLine]: should end the game when the player stands on the first line', () => {
    MapGenerationFunctions.createGrid();
    Game.player.position.y = Game.grid[0].id;
    MapGenerationFunctions.deleteFirstLine();
    expect(Game.grid.length).toBe(7);
    expect(Game.state).toBe(GlobalTypes.states.finished);
});

test('[createGrid]: should create grid with 8 lines', () => {
    Game.grid = [];
    MapGenerationFunctions.createGrid();
    expect(Game.grid.length).toBe(8);
});
