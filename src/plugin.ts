import streamDeck, { LogLevel} from "@elgato/streamdeck";

import { GameInput } from "./actions/game-input";

streamDeck.logger.setLevel(LogLevel.TRACE);
streamDeck.actions.registerAction(new GameInput());
streamDeck.connect();