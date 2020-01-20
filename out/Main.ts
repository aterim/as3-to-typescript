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

			this._bestScore = int.int( 3 + int.int(i1))
			console.log(int.int(i1) / Main.mainSeed + 8 + this._bestScore);

			var k: number = 9

			this._bestScore += int.int( Main.mainSeed + (Main.mainSeed += int.uint( (2+2))));
			this.test(4.5);
		}

		private test(a: number): void {
			var b: uint = a;
			a = a + int.uint(b);
			a += int.uint(b) + 1;
			b += int.uint( a + 1);

			console.log(int.uint(b));

			for (var i: integer = 0; int.int(i) < 99; i++) {
				
			}
		}

	}
}
