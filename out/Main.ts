module com.midasplayer.games.candycrush
{

    import int = flash.utils.int;

	import TickTween = com.midasplayer.animation.tweenick.TickTween;
	import Engine = com.midasplayer.engine.Engine;
	import GameDataParser = com.midasplayer.engine.GameDataParser;
	import IEngine = com.midasplayer.engine.IEngine;
	import IEngineFactory = com.midasplayer.engine.IEngineFactory;
	import IGameComm = com.midasplayer.engine.comm.IGameComm;
	import Recorder = com.midasplayer.engine.replay.Recorder;
	import SoundVars = com.midasplayer.games.candycrush.audio.SoundVars;
	import UiButtonRenderer = com.midasplayer.games.candycrush.render.UiButtonRenderer;
	import KeyboardInput = com.midasplayer.input.KeyboardInput;
	import MouseInput = com.midasplayer.input.MouseInput;
	import MtRandom = com.midasplayer.math.MtRandom;
	import AdjustableTimer = com.midasplayer.time.AdjustableTimer;
	import ITimer = com.midasplayer.time.ITimer;
	import System = flash.system.System;

	/**
	 * Creates an engine. The reason for the factory is that the creation should be delayed
	 * until the stage has been initialized. I am not sure if this is a good solution as it creates
	 * more boiler plate code. Open for suggestions.
	 *
	 * @author Jon Kågström/Aron Nieminen
	 */

	export class EngineFactory implements IEngineFactory
	{
		constructor(comm:IGameComm, timer:ITimer)
		{
			this._comm = comm;
			this._timer = timer;
		}

		public create():IEngine
		{
			var gameDataParser:GameDataParser = new GameDataParser(this._comm.getGameData());
			var isShortGame:boolean = gameDataParser.getAsBool("isShortGame");
			SoundVars.soundOn = gameDataParser.getAsBool("soundOn");
			SoundVars.musicOn = gameDataParser.getAsBool("musicOn");

			var mouseInput:MouseInput = new MouseInput;
			var keyboardInput:KeyboardInput = new KeyboardInput; 

			var recorder:Recorder = new Recorder(this._comm);
			var random:MtRandom = new MtRandom(gameDataParser.getRandomSeed());
			var tickTween:TickTween = new TickTween();
			UiButtonRenderer.instance.setTweener(tickTween);

			var intro:Intro = new Intro(gameDataParser, tickTween);

			var gameView:GameView = new GameView(gameDataParser, tickTween, isShortGame);
			var gameLogic:Logic = new Logic(	mouseInput,
												recorder,
												random,
												tickTween,
												gameView,
												isShortGame,
												this.BoosterPack.fromGameData(gameDataParser));

			var outro:Outro = new Outro(gameDataParser, gameLogic, gameView, isShortGame);

			this.Main.configTimer(this._timer);
			gameLogic.addTickable(gameView);

			return new Engine(intro,
				intro,
				gameLogic,
				gameView,
				outro,
				outro,
				this._timer,
				this.Ticks.TicksPerSecond,
				this._comm,
				recorder,
				mouseInput,
				keyboardInput,
				Engine.MousePosition | Engine.MousePressed | Engine.MouseReleased | Engine.KeyboardPressed | Engine.KeyboardReleased);
		}

		public runGames(low:integer, high:integer): void
		{
			var gameDataParser:GameDataParser = new GameDataParser(this._comm.getGameData());
			
			var mouseInput:MouseInput = new MouseInput;
			var keyboardInput:KeyboardInput = new KeyboardInput; 

			var recorder:Recorder = new Recorder(this._comm);
			var random:MtRandom = new MtRandom(gameDataParser.getRandomSeed());
			var tickTween:TickTween = new TickTween();
			var intro:Intro = new Intro(gameDataParser, tickTween);

			SoundVars.soundOn = gameDataParser.getAsBool("soundOn");
			SoundVars.musicOn = gameDataParser.getAsBool("musicOn");
			var isShortGame:boolean = gameDataParser.getAsBool("isShortGame");

			var gameView:GameView = new GameView(gameDataParser, tickTween, isShortGame);
			var gameLogic:Logic = new Logic(	mouseInput,
												recorder,
												random,
												tickTween,
												gameView,
												isShortGame,
												this.BoosterPack.fromGameData(gameDataParser));

			var boosters:BoosterPack = this.BoosterPack.fromGameData(gameDataParser);
			var seedString:string = "";
			for (var i:integer = int.int(low); int.int(i) < int.int(high); ++i)
			{
				var rnd:MtRandom = new MtRandom(int.int(i));
				var log:Logic = new Logic(mouseInput, recorder, rnd, tickTween, gameView, false, boosters);

				var m:any[] = log.getBoard()._mInt;

				// First row is correct, write down seed
				if (m[0][0] == this.GameView.COLOR_RED &&
					m[0][1] == this.GameView.COLOR_PURPLE &&
					m[0][2] == this.GameView.COLOR_ORANGE &&
					m[0][3] == this.GameView.COLOR_BLUE &&
					m[0][4] == this.GameView.COLOR_GREEN &&
					m[0][5] == this.GameView.COLOR_BLUE &&
					m[0][6] == this.GameView.COLOR_ORANGE &&
					m[0][7] == this.GameView.COLOR_PURPLE &&
					m[0][8] == this.GameView.COLOR_PURPLE
					)
				{
					console.log("seed : " + int.int(i));
					seedString += "possible: " + int.int(i) + "\n";
					System.setClipboard(seedString);
					this.Main.Log.trace(seedString);
				}

				if ((i & 127) == 0)
				{
					//Main.Log.trace("i " + i);
					console.log("i " + int.int(i));
					//System.setClipboard("i " + i);
				}
				if ((i & 2047) == 0)
					this.Main.Log.trace("i " + int.int(i));
			}
		}
		
		private _comm:IGameComm;
		private _timer:ITimer;
	}
}
