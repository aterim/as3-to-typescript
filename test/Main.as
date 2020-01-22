package com.midasplayer.games.candycrush
{
	import com.midasplayer.animation.tweenick.TickTween;
	import com.midasplayer.engine.Engine;
	import com.midasplayer.engine.GameDataParser;
	import com.midasplayer.engine.IEngine;
	import com.midasplayer.engine.IEngineFactory;
	import com.midasplayer.engine.comm.IGameComm;
	import com.midasplayer.engine.replay.Recorder;
	import com.midasplayer.games.candycrush.audio.SoundVars;
	import com.midasplayer.games.candycrush.render.UiButtonRenderer;
	import com.midasplayer.input.KeyboardInput;
	import com.midasplayer.input.MouseInput;
	import com.midasplayer.math.MtRandom;
	import com.midasplayer.time.AdjustableTimer;
	import com.midasplayer.time.ITimer;
	import flash.system.System;

	/**
	 * Creates an engine. The reason for the factory is that the creation should be delayed
	 * until the stage has been initialized. I am not sure if this is a good solution as it creates
	 * more boiler plate code. Open for suggestions.
	 *
	 * @author Jon Kågström/Aron Nieminen
	 */

	public class EngineFactory implements IEngineFactory
	{
		public function EngineFactory(comm:IGameComm, timer:ITimer)
		{
			_comm = comm;
			_timer = timer;
		}

		public function create():IEngine
		{
			const gameDataParser:GameDataParser = new GameDataParser(_comm.getGameData());
			const isShortGame:Boolean = gameDataParser.getAsBool("isShortGame");
			SoundVars.soundOn = gameDataParser.getAsBool("soundOn");
			SoundVars.musicOn = gameDataParser.getAsBool("musicOn");

			const mouseInput:MouseInput = new MouseInput;
			const keyboardInput:KeyboardInput = new KeyboardInput; 

			const recorder:Recorder = new Recorder(_comm);
			const random:MtRandom = new MtRandom(gameDataParser.getRandomSeed());
			const tickTween:TickTween = new TickTween();
			UiButtonRenderer.instance.setTweener(tickTween);

			const intro:Intro = new Intro(gameDataParser, tickTween);

			const gameView:GameView = new GameView(gameDataParser, tickTween, isShortGame);
			const gameLogic:Logic = new Logic(	mouseInput,
												recorder,
												random,
												tickTween,
												gameView,
												isShortGame,
												BoosterPack.fromGameData(gameDataParser));

			const outro:Outro = new Outro(gameDataParser, gameLogic, gameView, isShortGame);

			Main.configTimer(_timer);
			gameLogic.addTickable(gameView);

			return new Engine(intro,
				intro,
				gameLogic,
				gameView,
				outro,
				outro,
				_timer,
				Ticks.TicksPerSecond,
				_comm,
				recorder,
				mouseInput,
				keyboardInput,
				Engine.MousePosition | Engine.MousePressed | Engine.MouseReleased | Engine.KeyboardPressed | Engine.KeyboardReleased);
		}

		public function runGames(low:int, high:int): void
		{
			const gameDataParser:GameDataParser = new GameDataParser(_comm.getGameData());
			
			const mouseInput:MouseInput = new MouseInput;
			const keyboardInput:KeyboardInput = new KeyboardInput; 

			const recorder:Recorder = new Recorder(_comm);
			const random:MtRandom = new MtRandom(gameDataParser.getRandomSeed());
			const tickTween:TickTween = new TickTween();
			const intro:Intro = new Intro(gameDataParser, tickTween);

			SoundVars.soundOn = gameDataParser.getAsBool("soundOn");
			SoundVars.musicOn = gameDataParser.getAsBool("musicOn");
			const isShortGame:Boolean = gameDataParser.getAsBool("isShortGame");

			const gameView:GameView = new GameView(gameDataParser, tickTween, isShortGame);
			const gameLogic:Logic = new Logic(	mouseInput,
												recorder,
												random,
												tickTween,
												gameView,
												isShortGame,
												BoosterPack.fromGameData(gameDataParser));

			const boosters:BoosterPack = BoosterPack.fromGameData(gameDataParser);
			var seedString:String = "";
			for (var i:int = low; i < high; ++i)
			{
				const rnd:MtRandom = new MtRandom(i);
				const log:Logic = new Logic(mouseInput, recorder, rnd, tickTween, gameView, false, boosters);

				const m:Vector.<Vector.<int>> = log.getBoard()._mInt;

				// First row is correct, write down seed
				if (m[0][0] == GameView.COLOR_RED &&
					m[0][1] == GameView.COLOR_PURPLE &&
					m[0][2] == GameView.COLOR_ORANGE &&
					m[0][3] == GameView.COLOR_BLUE &&
					m[0][4] == GameView.COLOR_GREEN &&
					m[0][5] == GameView.COLOR_BLUE &&
					m[0][6] == GameView.COLOR_ORANGE &&
					m[0][7] == GameView.COLOR_PURPLE &&
					m[0][8] == GameView.COLOR_PURPLE
					)
				{
					trace("seed : " + i);
					seedString += "possible: " + i + "\n";
					System.setClipboard(seedString);
					Main.Log.trace(seedString);
				}

				if ((i & 127) == 0)
				{
					//Main.Log.trace("i " + i);
					trace("i " + i);
					//System.setClipboard("i " + i);
				}
				if ((i & 2047) == 0)
					Main.Log.trace("i " + i);
			}
		}
		
		private var _comm:IGameComm;
		private var _timer:ITimer;
	}
}
