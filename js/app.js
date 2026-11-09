(function ($) {
  'use strict';
  if (!$) { document.getElementById('status').textContent = 'jQuery could not load. Check your connection and refresh.'; return; }
  const key = window.FLICKPICK_CONFIG.apiKey.trim();
  const demo = !key;
  const storageKey = 'flickpick.watchlist.v1';
  const genres = [{id:28,name:'Action'},{id:12,name:'Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},{id:80,name:'Crime'},{id:18,name:'Drama'},{id:14,name:'Fantasy'},{id:27,name:'Horror'},{id:10749,name:'Romance'},{id:878,name:'Science Fiction'},{id:53,name:'Thriller'}];
  let saved = [], items = [], collection = 'popular', genre = '', sort = 'default';
  let route = {}, generation = 0, suggestionGeneration = 0, timer, returnHash = '#discover';
  try { const data = JSON.parse(localStorage.getItem(storageKey) || '[]'); saved = Array.isArray(data) ? data.filter(m => m && Number.isInteger(m.id) && typeof m.title === 'string') : []; } catch (_) { }
  function announce(text) { $('#status').text(text); }
  function count() { $('#saved-count').text(saved.length); }
  function has(id) { return saved.some(m => m.id === id); }
  function saveButton(m) { return $('<button>', {class:'save',type:'button','data-save':m.id,'aria-pressed':String(has(m.id)), 'aria-label':(has(m.id)?'Remove ':'Save ')+m.title+(has(m.id)?' from watchlist':' to watchlist')}).text(has(m.id)?'✓ Saved · Remove':'+ Add to watchlist'); }
  function poster(m) {
    const box = $('<div>',{class:'poster'}).append($('<span>',{class:'fallback','aria-hidden':'true'}).text(m.title));
    if (m.poster_path && /^\/[A-Za-z0-9._-]+$/.test(m.poster_path)) {
      $('<img>',{src:'https://image.tmdb.org/t/p/w500'+m.poster_path,alt:'',loading:'lazy'}).on('error',function(){ $(this).remove(); box.find('.fallback').show(); }).on('load',()=>box.find('.fallback').hide()).appendTo(box);
    }
    box.append($('<span>',{class:'rating'}).text('★ '+(Number(m.vote_average)||0).toFixed(1)+' / 10')); return box;
  }
  function request(path, data) {
    return $.ajax({url:'https://api.themoviedb.org/3'+path, data:$.extend({api_key:key,language:'en-US'},data), dataType:'json',timeout:15000});
  }
  function sorted(list) {
    return list.slice().sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='rating'?b.vote_average-a.vote_average:sort==='newest'?(b.release_date||'').localeCompare(a.release_date||''):0);
  }
  function cards(list) {
    const grid=$('#grid').empty();
    if (!list.length) grid.append($('<p>',{class:'empty'}).text(route.view==='watchlist'?'Your watchlist is ready for its first movie. Browse Discover and save a favorite.':'No movies found. Try another title or genre.'));
    list.forEach(m=>{
      const card=$('<article>',{class:'card'});
      $('<button>',{type:'button',class:'poster-link','data-movie':m.id,'aria-label':'View details for '+m.title}).append(poster(m)).appendTo(card);
      card.append($('<h3>').text(m.title),$('<p>').text((m.release_date||'').slice(0,4)||'Release date unavailable'),saveButton(m)); grid.append(card);
    });
  }
  function pagination(page,total) {
    $('#page-label').text('Page '+page+' of '+Math.max(1,total));
    $('#previous').prop('disabled',page<=1); $('#next').prop('disabled',page>=total);
    $('.pagination').toggle(total>1);
  }
  function fail(error, retry) {
    announce(error.status===401?'TMDB rejected the API key. Check js/config.js.':error.status===429?'TMDB is busy. Wait a moment and try again.':'Movies could not load. Check your connection and try again.');
    $('#grid').empty().append($('<button>',{type:'button'}).text('Try again').on('click',retry));
  }
  async function browse(token) {
    const isWatch=route.view==='watchlist', isSearch=route.view==='search';
    $('#browse').prop('hidden',false).show(); $('#detail').prop('hidden',true).hide();
    $('#view-title').text(isWatch?'My Watchlist':isSearch?'Results for “'+route.query+'”':'Discover movies');
    $('#section-label').text(isWatch?'SAVED FOR ANOTHER NIGHT':isSearch?'FIND YOUR NEXT FAVORITE':'YOUR NEXT GREAT WATCH');
    $('#tabs').toggle(!isWatch&&!isSearch); $('#genres').toggle(!isWatch&&!isSearch);
    $('#sort-help').text(isSearch?'Sorting applies to the current page of search results.':'');
    $('nav [data-view]').removeAttr('aria-current').filter('[data-view="'+(isWatch?'watchlist':'discover')+'"]').attr('aria-current','page');
    $('#grid').empty(); $('.pagination').hide(); $('#browse').attr('aria-busy','true'); announce('Loading movies…');
    try {
      let result;
      if (isWatch) result={results:saved,total_pages:1};
      else if (demo) {
        let list=window.FLICKPICK_DEMO.filter(m=>isSearch?m.title.toLowerCase().includes(route.query.toLowerCase()):!genre||m.genre_ids.includes(Number(genre)));
        if (collection==='top_rated'&&!isSearch) list.sort((a,b)=>b.vote_average-a.vote_average);
        list=sorted(list); result={results:list.slice((route.page-1)*10,route.page*10),total_pages:Math.ceil(list.length/10)};
      } else if (isSearch) result=await request('/search/movie',{query:route.query,page:route.page,include_adult:false});
      else if (!genre && sort==='default') result=await request('/movie/'+collection,{page:route.page});
      else {
        const order={default:collection==='top_rated'?'vote_average.desc':'popularity.desc',rating:'vote_average.desc',newest:'primary_release_date.desc',title:'title.asc'};
        result=await request('/discover/movie',{page:route.page,include_adult:false,with_genres:genre,sort_by:order[sort],'vote_count.gte':collection==='top_rated'?300:50,'primary_release_date.lte':new Date().toISOString().slice(0,10)});
      }
      if(token!==generation)return;
      items=result.results||[]; cards(sorted(items)); pagination(route.page,Math.min(result.total_pages||1,500));
      announce(items.length+' movies shown'+(demo?' · Sample data.':'.'));
    } catch(error) { if(token===generation)fail(error,render); }
    finally { if(token===generation)$('#browse').attr('aria-busy','false'); }
  }
  async function detail(token) {
    $('#browse').prop('hidden',true).hide(); $('#detail').prop('hidden',false).show().empty().attr('aria-busy','true'); announce('Loading movie details…');
    try {
      const m=demo?window.FLICKPICK_DEMO.find(m=>m.id===route.id):await request('/movie/'+route.id,{append_to_response:'credits'});
      if(token!==generation)return;
      if(!m)throw new Error('Missing movie');
      items=[m];
      const root=$('#detail').empty(); $('<button>',{class:'back',type:'button'}).text('← Back to movies').on('click',()=>{location.hash=returnHash;}).appendTo(root);
      const layout=$('<div>',{class:'detail-layout'}).append(poster(m)); const content=$('<div>');
      content.append($('<p>',{class:'eyebrow'}).text('TAKE A CLOSER LOOK'),$('<h2>',{id:'detail-title',tabindex:-1}).text(m.title),$('<p>').text(m.overview||'No overview is available.'));
      const dl=$('<dl>');
      [['Released',m.release_date||'Unavailable'],['Runtime',m.runtime?m.runtime+' minutes':'Unavailable'],['Rating',(Number(m.vote_average)||0).toFixed(1)+' / 10'],['Genres',(m.genres||genres.filter(g=>(m.genre_ids||[]).includes(g.id))).map(g=>g.name).join(', ')||'Unavailable']].forEach(([a,b])=>dl.append($('<dt>').text(a),$('<dd>').text(b)));
      content.append(dl,saveButton(m),$('<h3>').text('Top billed cast'));
      const cast=(m.credits&&m.credits.cast||[]).slice(0,6);
      if(cast.length){const ul=$('<ul>',{class:'cast'});cast.forEach(p=>ul.append($('<li>').text(p.name+' as '+p.character)));content.append(ul);}else content.append($('<p>',{class:'muted'}).text(demo?'Cast is available when live TMDB data is enabled.':'Cast information unavailable.'));
      root.append(layout.append(content)); $('#detail-title').trigger('focus'); announce('Details for '+m.title+'.');
    }catch(error){if(token===generation){$('#detail').empty().append($('<a>',{href:'#discover'}).text('Return to Discover'));announce('Movie details could not load. Return to Discover and try again.');}}
    finally{if(token===generation)$('#detail').attr('aria-busy','false');}
  }
  function render() {
    if(location.hash === '#main')return;
    ++generation; ++suggestionGeneration; clearTimeout(timer); $('#suggestions').empty().hide();
    const params=new URLSearchParams(location.hash.slice(1)); const view=params.get('view')||location.hash.slice(1)||'discover';
    route={view:['discover','search','watchlist','movie'].includes(view)?view:'discover',page:Math.max(1,Math.min(500,parseInt(params.get('page'),10)||1)),query:params.get('q')||'',id:Number(params.get('id'))};
    document.title=(route.view==='watchlist'?'My Watchlist':route.view==='search'?'Search':'Discover')+' | FlickPick';
    if(route.view==='search')$('#search').val(route.query);
    if(route.view==='movie')detail(generation);else{returnHash=location.hash||'#discover';browse(generation);}
  }
  function go(page){const p=new URLSearchParams({view:route.view,page});if(route.view==='search')p.set('q',route.query);location.hash=p.toString();}
  function refresh(){if(route.page!==1)go(1);else render();}
  $('#search-form').on('submit',function(e){e.preventDefault();const q=$('#search').val().trim();if(q)location.hash=new URLSearchParams({view:'search',q,page:1}).toString();else location.hash='discover';});
  $('#search').on('input',function(){
    clearTimeout(timer); const q=$(this).val().trim(),token=++suggestionGeneration; $('#suggestions').empty().hide();
    if(q.length<2)return;
    timer=setTimeout(async()=>{try{
      const result=demo?{results:window.FLICKPICK_DEMO.filter(m=>m.title.toLowerCase().includes(q.toLowerCase()))}:await request('/search/movie',{query:q,include_adult:false});
      if(token!==suggestionGeneration)return;
      const ul=$('#suggestions').empty();result.results.slice(0,5).forEach(m=>ul.append($('<li>').append($('<button>',{type:'button','data-movie':m.id}).text(m.title+' ('+((m.release_date||'').slice(0,4)||'Year unknown')+')'))));ul.prop('hidden',!result.results.length).toggle(!!result.results.length);
    }catch(_){}},300);
  });
  $(document).on('keydown',function(e){if(e.key!=='Escape')return;const open=$('#suggestions').is(':visible'),inForm=$(e.target).closest('#search-form').length>0;if(!open&&!inForm)return;++suggestionGeneration;$('#suggestions').empty().hide();if(open)$('#search').trigger('focus');});
  $(document).on('click','[data-movie]',function(){location.hash='view=movie&id='+$(this).attr('data-movie');});
  $(document).on('click','[data-save]',function(){
    const id=Number($(this).attr('data-save')); const m=items.find(x=>x.id===id)||saved.find(x=>x.id===id);if(!m)return;
    const removing=has(id), next=removing?saved.filter(x=>x.id!==id):saved.concat(m);
    try{localStorage.setItem(storageKey,JSON.stringify(next));saved=next;}catch(_){announce('Your browser could not save the watchlist. Allow local storage and try again.');return;}
    count(); if(route.view==='watchlist'){items=saved;cards(sorted(saved));$('#view-title').trigger('focus');}else {const replacement=saveButton(m);$(this).replaceWith(replacement);replacement.trigger('focus');}announce(m.title+(removing?' removed from':' added to')+' your watchlist.');
  });
  $('#sort').on('change',function(){sort=this.value;refresh();});
  $('#tabs').on('click','button',function(){collection=$(this).attr('data-collection');$('#tabs button').attr('aria-pressed','false');$(this).attr('aria-pressed','true');refresh();});
  $('#genres').append($('<button>',{type:'button','data-genre':'','aria-pressed':'true'}).text('All genres'));
  genres.forEach(g=>$('#genres').append($('<button>',{type:'button','data-genre':g.id,'aria-pressed':'false'}).text(g.name)));
  $('#genres').on('click','button',function(){genre=$(this).attr('data-genre');$('#genres button').attr('aria-pressed','false');$(this).attr('aria-pressed','true');refresh();});
  $('#previous').on('click',()=>go(route.page-1));$('#next').on('click',()=>go(route.page+1));
  $(window).on('hashchange',render);
  if(demo)$('#mode').text('Demo mode · Showing sample movies. Live data is not connected.').prop('hidden',false);
  count();render();
})(window.jQuery);
