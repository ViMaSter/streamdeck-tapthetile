import { action, JsonObject, KeyDownEvent, SingletonAction, WillAppearEvent, KeyAction, streamDeck} from "@elgato/streamdeck";

@action({ UUID: "ke.mahn.vincent.tapthetile.gameinput" })
export class GameInput extends SingletonAction {
	constructor() {
		super();
	}
	
	private actionByCoordinates : KeyAction<JsonObject>[][] = [];

	override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
		// if center tile, set to white
		if (ev.action.coordinates?.column === 2 && ev.action.coordinates?.row === 1) {
			ev.action.setImage(GameInput.whiteSquare);
			return;
		}

		ev.action.setImage(GameInput.blackSquare);
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		streamDeck.logger.info("IncrementCounter.onKeyDown", ev.action, ev.payload);

		if (this.gameInterval != null) {
			this.gameInput(ev.action.coordinates?.column ?? -1, ev.action.coordinates?.row ?? -1);
			return;
		}

		// game isn't started yet, so we need to start it
		let lastDeltaTime = new Date().getTime();
		this.score = 0;
		this.gameStart();
		this.gameInterval = setInterval(async () => {
			const newDeltaTime = new Date().getTime();
			await this.gameLoop((newDeltaTime - lastDeltaTime) / 1000);
			lastDeltaTime = newDeltaTime;
		}, 1/15);
	}

	private gameInterval : NodeJS.Timeout | null = null;

	private static whiteSquare = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#FFFFFF" /></svg>`;
	private static blackSquare = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#000000" /></svg>`;

	private score : number = 0;

	private timeUntilNewSquare = 1;
	private timeOfLastSquare = 0;
	private currentSquare : [number, number] = [0, 0];

	private generateNewSquare() {
		this.timeOfLastSquare = this.now;
		let newRandom : [number, number] = [-1, -1];
		streamDeck.logger.info("IncrementCounter.length", this.actionByCoordinates.length, this.actionByCoordinates[0].length);
		do {
			newRandom = [Math.floor(Math.random() * (this.actionByCoordinates.length)), Math.floor(Math.random() * (this.actionByCoordinates[0].length))];
		} while (this.currentSquare[0] === newRandom[0] && this.currentSquare[1] === newRandom[1]);
		this.currentSquare = newRandom;
	}

	async gameInput(colIndex : number, rowIndex : number) {
		if (this.currentSquare[0] === colIndex && this.currentSquare[1] === rowIndex) {
			this.score++;
			this.generateNewSquare();
		} else {
			clearInterval(this.gameInterval as NodeJS.Timeout);
			this.gameInterval = null;
			// clear current square by setting it to black square
			this.actionByCoordinates[this.currentSquare[0]][this.currentSquare[1]].setImage(GameInput.blackSquare);
			// set Top center square to "Game Over"
			this.actionByCoordinates[2][0].setTitle("Game\nOver");
			// set Bottom center square to "Again?
			this.actionByCoordinates[2][2].setTitle("Again?");
		}
	}
	
	private now = -1;

	async gameStart() {
		streamDeck.actions.forEach((action) => {
			const coordinates = {action};
			this.actionByCoordinates[coordinates.action.coordinates?.column ?? -1] ??= [];
			this.actionByCoordinates[coordinates.action.coordinates?.column ?? -1][coordinates.action.coordinates?.row ?? -1] = action as KeyAction<JsonObject>;
		});

		for (let colIndex = 0; colIndex < this.actionByCoordinates.length; colIndex++) {
			const columns = this.actionByCoordinates[colIndex];
			if (!columns) continue;

			for (let rowIndex = 0; rowIndex < columns.length; rowIndex++) {
				const row = columns[rowIndex];
				if (!row) continue;

				// set svg of black square
				await row.setTitle("");
			}
		}

		this.now = new Date().getTime() / 1000;
		this.generateNewSquare();
	}

	async gameLoop(deltaTime : number) {
		this.now = new Date().getTime() / 1000;
		// if time of last square + time until new square is greater than now, set new square
		if (this.timeOfLastSquare + this.timeUntilNewSquare < this.now) {
			this.generateNewSquare();
		}
		
		for (let colIndex = 0; colIndex < this.actionByCoordinates.length; colIndex++) {
			const columns = this.actionByCoordinates[colIndex];
			if (!columns) continue;

			for (let rowIndex = 0; rowIndex < columns.length; rowIndex++) {
				const row = columns[rowIndex];
				if (!row) continue;

				// set svg of black square
				if (colIndex === 2 && rowIndex === 1) {
					await row.setTitle(this.score.toString());
				}
				if (this.currentSquare[0] === colIndex && this.currentSquare[1] === rowIndex) {
					await row.setImage(GameInput.whiteSquare);
				} else {
					await row.setImage(GameInput.blackSquare);
				}
			}
		}


	}
}
