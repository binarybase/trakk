const ENTITIES = {
	'&' : '&amp;',
	'<' : '&lt;',
	'>' : '&gt;',
	'"' : '&quot;',
	'`' : '&apos;'
  };

export const decode = (string) => {
	for(const char in ENTITIES) {
		var before = char;
		var after = ENTITIES[char]; 
		var pattern = new RegExp(before, 'g');
		string = string.replace(pattern, after);    
	}

	return string;
 }