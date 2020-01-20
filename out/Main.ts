module
{

    import int = flash.utils.int;


	export class Main 
	{

		private _bestScore: integer;
		private static mainSeed: uint;

		static h: boolean;

		private _bool: boolean;

		constructor()
		{
			var i1: integer = 5/2;
			Main.mainSeed = int.uint( Math.PI + 89 * 7 + int.int(i1) + 0.3);

			this._bestScore = int.int( 3)
			console.log(int.int(i1) + Main.mainSeed + 8 + this._bestScore);

			var k: number = 9

			this._bestScore += int.int( Main.mainSeed + (Main.mainSeed += int.uint( (2+2))));
		}

	}
}
