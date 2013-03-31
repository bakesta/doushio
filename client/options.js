var nashi = {opts: []}, inputMinSize = 300;
var shortcutKeys = {};

function extract_num(q) {
	return parseInt(q.attr('id'), 10);
}

function parent_post($el) {
	var $post = $el.parents('article');
	return $post.length ? $post : $el.parents('section');
}

(function () {

nashi.upload = !!$('<input type="file"/>').prop('disabled');

if (window.screen && screen.width <= 320)
	inputMinSize = 50;

function load_ident() {
	try {
		var id = JSON.parse(localStorage.ident);
		if (id.name)
			$name.val(id.name);
		if (id.email)
			$email.val(id.email);
	}
	catch (e) {}
}

function save_ident() {
	try {
		var name = $name.val(), email = $email.val();
		if (email == 'misaki') {
			$email.val('');
			yepnope(mediaURL + 'js/login-v2.js');
			email = false;
		}
		else if (is_sage(email) && !is_noko(email))
			email = false;
		var id = {};
		if (name || email) {
			if (name)
				id.name = name;
			if (email)
				id.email = email;
			localStorage.setItem('ident', JSON.stringify(id));
		}
		else
			localStorage.removeItem('ident');
	}
	catch (e) {}
}

function save_opts() {
	try {
		localStorage.options = JSON.stringify(options);
	}
	catch (e) {}
}

var optSpecs = [];
function add_spec(id, label, func, type) {
	id = id.replace(/\$BOARD/g, BOARD);
	if (!func)
		func = function () {};
	optSpecs.unshift({id: id, label: label, func: func, type: type});
}

/* THEMES */

var themes = ['moe', 'gar', 'mawaru', 'moon', 'ashita', 'console'];
var globalVersion = 8;

add_spec('board.$BOARD.theme', 'Theme', function (theme) {
	if (theme) {
		var css = theme + '-v' + globalVersion + '.css';
		$('#theme').attr('href', mediaURL + 'css/' + css);
	}
}, themes);

/* THUMBNAIL OPTIONS */

/* TEMP migration */
(function () {
	$.cookie('img', null);
	var old = 'board.' + BOARD + '.hideimages';
	var key = 'board.' + BOARD + '.thumbs';
	var changed = false;
	if (options.thumbs) {
		if (!options[key]) {
			options[key] = options.thumbs;
			changed = true;
		}
		/* later: delete options.thumbs */
	}
	if (old in options) {
		if (options[old])
			options[key] = 'hide';
		delete options[old];
		changed = true;
	}
	if (changed)
		save_opts();
})();

var revealSetup = false;

add_spec('board.$BOARD.thumbs', 'Thumbnails', function (type) {
	$.cookie('thumb', type);
	// really ought to apply the style immediately
	// need pinky/mid distinction in the model to do properly
	oneeSama.thumbStyle = type;
	var hide = type == 'hide';
	if (hide)
		$('img').hide();
	else
		$('img').show();

	if (hide && !revealSetup)
		$DOC.on('click', 'article', reveal_thumbnail);
	else if (!hide && revealSetup)
		$DOC.off('click', 'article', reveal_thumbnail);
	revealSetup = hide;
}, thumbStyles);

/* Alt-click a post to reveal its thumbnail if hidden */
function reveal_thumbnail(event) {
	if (!event.altKey)
		return;
	var $article = $(event.target);
	var $img = $article.find('img');
	if ($img.length) {
		with_dom(function () { $img.show(); });
		return false;
	}

	/* look up the image info and make the thumbnail */
	var post = lookup_post(extract_num($article));
	if (!post)
		return;
	var info = post.get('image');
	if (!info)
		return;

	with_dom(function () {
		$article.find('figcaption').after($.parseHTML(flatten(
				oneeSama.gazou_img(info, false)).join('')));
	});
	return false;
}

/* BACKLINKS */

if (THREAD) {
	add_spec('nobacklinks', 'Backlinks', function (b) {
		if (b)
			$('small').remove();
		else
			show_backlinks();
	}, 'revcheckbox');
}

function show_backlinks() {
	if (!CurThread)
		return;
	if (load_page_backlinks) {
		with_dom(load_page_backlinks);
		load_page_backlinks = null;
	}
	else {
		CurThread.each(function (reply) {
			if (reply.has('backlinks'))
				reply.trigger('change:backlinks');
		});
	}
}

var load_page_backlinks = function () {
	$('blockquote a').each(function () {
		var $a = $(this);
		var m = $a.attr('href').match(/^#(\d+)$/);
		if (!m)
			return;
		var destId = parseInt(m[1], 10);
		if (!CurThread.get(destId)) // local backlinks only for now
			return;
		var src = CurThread.get(extract_num(parent_post($a)));
		if (!src)
			return;
		var update = {};
		update[destId] = THREAD;
		add_post_links(src, update);
	});
};

/* INLINE EXPANSION */

if (window.devicePixelRatio > 1)
	add_spec('nohighres', 'High-res expansions', null, 'revcheckbox');

add_spec('inline', 'Inline image expansion', null, 'checkbox');

$DOC.on('mouseup', 'img', function (event) {
	/* Bypass expansion for non-left mouse clicks */
	if (options.inline && event.which > 1) {
		var img = $(this);
		img.data('skipExpand', true);
		setTimeout(function () {
			img.removeData('skipExpand');
		}, 100);
	}
});

$DOC.on('click', 'img', function (event) {
	if (options.inline) {
		var $target = $(this);
		if (!$target.data('skipExpand'))
			toggle_expansion($target, event);
	}
});

function toggle_expansion(img, event) {
	var href = img.parent().attr('href');
	if (/^\.\.\/outbound\//.test(href))
		return;
	event.preventDefault();
	var expand = !img.data('thumbSrc');
	if (expand)
		img.closest('figure').addClass('expanded');
	else
		img.closest('figure').removeClass('expanded');
	var $imgs = img;
	if (THREAD && (event.altKey || event.shiftKey)) {
		var post = img.closest('article');
		if (post.length)
			$imgs = post.nextAll(':has(img):lt(4)').andSelf();
		else
			$imgs = img.closest('section').children(
					':has(img):lt(5)');
		$imgs = $imgs.find('img');
	}

	with_dom(function () {
		$imgs.each(function () {
			var $img = $(this);
			if (expand)
				expand_image($img);
			else {
				contract_image($img, event);
				event = null; // de-zoom to first image only
			}
		});
	});
}

function contract_image($img, event) {
	var thumb = $img.data('thumbSrc');
	if (!thumb)
		return;
	// try to keep the thumbnail in-window for large images
	var h = $img.height();
	var th = parseInt($img.data('thumbHeight'), 10);
	if (event) {
		var y = $img.offset().top, t = $(window).scrollTop();
		if (y < t && th < h)
			window.scrollBy(0, Math.max(th - h,
					y - t - event.clientY + th/2));
	}
	$img.replaceWith($('<img>')
			.width($img.data('thumbWidth')).height(th)
			.attr('src', thumb));
}

function expand_image($img) {
	if ($img.data('thumbSrc'))
		return;
	var a = $img.parent();
	var href = a.attr('href');
	if (!href)
		return;
	var dims = a.siblings('figcaption').text().match(/(\d+)x(\d+)/);
	if (!dims)
		return;
	var w = parseInt(dims[1], 10), h = parseInt(dims[2], 10);
	var r = window.devicePixelRatio;
	if (!options.nohighres && r && r > 1) {
		w /= r;
		h /= r;
	}
	$img.replaceWith($('<img>').data({
		thumbWidth: $img.width(),
		thumbHeight: $img.height(),
		thumbSrc: $img.attr('src'),
	}).attr('src', href).width(w).height(h));
}

/* SHORTCUT KEYS */

var shortcuts = [
	{label: 'New post', name: 'new', which: 78},
	{label: 'Image spoiler', name: 'togglespoiler', which: 83},
	{label: 'Finish post', name: 'done', which: 68},
];

function toggle_shortcuts(event) {
	event.preventDefault();
	var $shortcuts = $('#shortcuts');
	if ($shortcuts.length)
		return $shortcuts.remove();
	$shortcuts = $('<div/>', {
		id: 'shortcuts',
		click: select_shortcut,
		keyup: change_shortcut,
	});
	shortcuts.forEach(function (s) {
		var value = String.fromCharCode(shortcutKeys[s.name]);
		var $label = $('<label>', {text: s.label});
		$('<input>', {
			id: s.name, maxlength: 1, val: value,
		}).prependTo($label);
		$label.prepend(document.createTextNode('Alt+'));
		$shortcuts.append($label, '<br>');
	});
	$shortcuts.appendTo('#options-panel');
}

function select_shortcut(event) {
	if ($(event.target).is('input'))
		$(event.target).val('');
}

function change_shortcut(event) {
	if (event.which == 13)
		return false;
	var $input = $(event.target);
	var letter = $input.val();
	if (!(/^[a-z]$/i.exec(letter)))
		return;
	var which = letter.toUpperCase().charCodeAt(0);
	var name = $input.attr('id');
	if (!(name in shortcutKeys))
		return;
	shortcutKeys[name] = which;
	if (!_.isObject(options.shortcuts))
		options.shortcuts = {};
	options.shortcuts[name] = which;
	save_opts();
	$input.blur();
}

(function () {
	load_ident();
	var save = _.debounce(save_ident, 1000);
	function prop() {
		if (postForm)
			postForm.propagate_ident();
		save();
	}
	$name.input(prop);
	$email.input(prop);

	$('<a id="options">Options</a>').click(function () {
		var $opts = $('#options-panel');
		if (!$opts.length)
			$opts = make_options_panel().appendTo('body');
		$opts.toggle('fast');
	}).insertAfter('#sync');

	_.each(optSpecs, function (spec) {
		(spec.func)(options[spec.id]);
	});

	var prefs = options.shortcuts || {};
	shortcuts.forEach(function (s) {
		shortcutKeys[s.name] = prefs[s.name] || s.which;
	});
})();

function make_options_panel() {
	var $opts = $('<div/>', {"class": 'modal', id: 'options-panel'});
	$opts.change(function (event) {
		var $o = $(event.target), id = $o.attr('id'), val;
		var spec = _.find(optSpecs, function (s) {
			return s.id == id;
		});
		if (!spec)
			return;
		if (spec.type == 'checkbox')
			val = !!$o.prop('checked');
		else if (spec.type == 'revcheckbox')
			val = !$o.prop('checked');
		else
			val = $o.val();
		options[id] = val;
		save_opts();
		with_dom(function () {
			(spec.func)(val);
		});
	});
	_.each(optSpecs, function (spec) {
		var id = spec.id;
		if (nashi.opts.indexOf(id) >= 0)
			return;
		var val = options[id], $input, type = spec.type;
		if (type == 'checkbox' || type == 'revcheckbox') {
			var b = (type == 'revcheckbox') ? !val : val;
			$input = $('<input type="checkbox" />')
				.prop('checked', b ? 'checked' : null);
		}
		else if (type instanceof Array) {
			$input = $('<select/>');
			_.each(type, function (item) {
				$('<option/>')
					.text(item).val(item)
					.appendTo($input);
			});
			if (type.indexOf(val) >= 0)
				$input.val(val);
		}
		var $label = $('<label/>').attr('for', id).text(spec.label);
		$opts.append($input.attr('id', id), ' ', $label, '<br>');
	});
	if (!nashi.shortcuts) {
		$opts.append($('<a/>', {
			href: '#', text: 'Shortcuts',
			click: toggle_shortcuts,
		}));
	}
	return $opts.hide();
}

})();
