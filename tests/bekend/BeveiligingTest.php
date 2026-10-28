<?php
	//
	// Known security bugs of Hypha (area beveiliging) that are shown at the unit/source level, not over HTTP. The
	// code under test is the checkout at HYPHA_CODE (cwd). See tests/bekend/fouten-beveiliging.ndjson.
	//

	known_bug(427, 'the README does not advise chmod -R 777 .', function () {
		//
		// The git install instructions tell the operator to run `chmod -R 777 .`, which makes the whole
		// installation, including the PHP code, world-writable. The README should advise write access on data/
		// only. (A fix may still name the command in a "do not use chmod -R 777" warning, so only the advised
		// command `chmod -R 777 .`, recursive on the installation folder, must be gone.)
		//
		$readme = file_get_contents(HYPHA_CODE . '/README.md');
		check($readme !== false, 'README.md not found at ' . HYPHA_CODE);
		lacks('chmod -R 777 .', $readme, 'the README still advises the recursive chmod -R 777 . command');
	});
