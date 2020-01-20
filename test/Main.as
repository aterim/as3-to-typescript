package
{

	public class Main 
	{

		private var _bestScore: int;
		static private var mainSeed: uint;

		static var h: Boolean;

		private var _bool: Boolean;

		public function Main()
		{
			var i1: int = 5/2;
			mainSeed = Math.PI + 89 * 7 + i1 + 0.3;

			_bestScore = 3 + i1
			trace(i1 / mainSeed + 8 + _bestScore);

			var k: Number = 9

			_bestScore += mainSeed + (mainSeed += (2+2));
			test(4.5);
		}

		private function test(a: Number): void {
			var b: uint = a;
			a = a + b;
			a += b + 1;
			b += a + 1;

			trace(b);

			for (var i: int = 0; i < 99; i++) {
				
			}
		}

	}
}
