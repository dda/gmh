var overlay, point, pos;

Number.prototype.toRad=function() {
 return this * (Math.PI / 180);
}

/***************************************************
               Google Maps Helper
***************************************************/
var GMH=function(map, elm) {
  this.map=map;
  this.element=elm;
  this.markers=[]; // to keep track of markers
  this.infoWindows={}; // to keep track of infoWindows
  this.DRIVING=google.maps.TravelMode.DRIVING;
  this.DRIVING=google.maps.TravelMode.BICYCLING;
  this.DRIVING=google.maps.TravelMode.WALKING;
  this.BOUNCE=google.maps.Animation.BOUNCE;
  this.DROP=google.maps.Animation.DROP;

  this.lastMarkerID='';
  this.lastInfoWindowID='';
  this.GLOBE_WIDTH = 256; // a constant in Google's map projection
}

var GMH_MarkerIcon=function(image, size, origin, anchor, scaledSize) {
  // size=[w,h]
  this.mi=new google.maps.MarkerImage(image);
  if(size!=null) this.setSize(size[0], size[1]);
  if(origin!=null) this.setOrigin(origin[0], origin[1]);
  if(anchor!=null) this.setOrigin(anchor[0], anchor[1]);
  if(scaledSize!=null) this.setScaledSize(scaledSize[0], scaledSize[1]);
}

GMH_MarkerIcon.prototype.setSize=function(w, h) {
  this.mi.size=new google.maps.Size(w, h);
}

GMH_MarkerIcon.prototype.setScaledSize=function(w, h) {
  this.mi.scaledSize=new google.maps.Size(w, h);
}

GMH_MarkerIcon.prototype.setOrigin=function(w, h) {
  this.mi.origin=new google.maps.Point(w, h);
}

GMH_MarkerIcon.prototype.setAnchor=function(w, h) {
  this.mi.anchor=new google.maps.Point(w, h);
}


  /**
   * adds a named marker at position destinationPos, with image as, well, image
   *
   * @param destinationPos  the coordinates to the marker
   * @param images      	path (string) pointing to the image file
   * @param name			the name of the marker
   * @return          		nada
   */

GMH.prototype.addMarker=function(destinationPos, name, image) {
  var marker=new google.maps.Marker({
    position: destinationPos,
  });
  marker.setMap(this.map);
  if(image!=null) marker.setIcon(image);
  if(name==null) name=this.generateUUID();
  this.markers[name]=marker;
  this.lastMarkerID=name;
}

  /**
   * adds a named infoWindow at position destinationPos, with text as description
   *
   * @param position		the coordinates to the infoWindow
   * @param text			the text you want to show
   * @param name			the name of the infoWindow
   * @return          		nada
   */

GMH.prototype.addInfoWindow = function(position, text, name) {
  var tempUUID=this.generateUUID();
  var infoWindow = new google.maps.InfoWindow({
    map: this.map,
    position: position,
    content: tempUUID
  });
  infoWindow.tempUUID=tempUUID;
  infoWindow.savedText=text;
  if(name==null) name=this.generateUUID();
  this.infoWindows[name]=infoWindow;
  this.lastInfoWindowID=name;
}

  /**
   * removes a named marker
   *
   * @param name	the name to the marker
   * @return    	nada
   */

GMH.prototype.removeMarker=function(name) {
  var mk=this.markers[name];
  if(mk==null) return;
  console.log('removing marker', mk);
  mk.setMap(null);
}

  /**
   * removes an infoWindow at position destinationPos
   *
   * @param name	the name of the infoWindow
   * @return		nada
   */

GMH.prototype.removeInfoWindow=function(name) {
  var iw=this.infoWindows[name];
  if(iw==null) return;
  console.log('removing infoWindow', iw);
  iw.setMap(null);
}

GMH.prototype.latLong=function(lt, lg) {
  return new google.maps.LatLng(lt, lg);
}

GMH.prototype.filterMarkers=function(nw, se, myMarkers) {
  var north=nw.lat();
  var west=nw.lng();
  var south=se.lat();
  var east=se.lng();
  var isInsideBounds=[];
  for (var i in myMarkers) {
    if(myMarkers[i].position.lat()>=north && myMarkers[i].position.lat()<=south && myMarkers[i].position.lng()>=west && myMarkers[i].position.lng()<=east) {
      isInsideBounds.push(myMarkers[i]);
    }
  }
  return isInsideBounds;
}



  /**
   * calculates distance between 2 points
   *
   * @param pos1		the starting point
   * @param pos2		the destination
   * @param mode		the transporation mode
   * @param callback	the callback function
   * @return			nada
   */

GMH.prototype.calculateDistance=function(pos1, pos2, mode, callback) {
  if(mode==undefined) mode=g.DRIVING;
   var dm=new google.maps.DistanceMatrixService();
   var DistanceMatrixRequest={};
   DistanceMatrixRequest.travelMode=mode;
   var destinations=[];
   destinations.push(pos1.lat()+","+pos1.lng());
   DistanceMatrixRequest.destinations=destinations;
   var origins=[];
   origins.push(pos2.lat()+","+pos2.lng());
   DistanceMatrixRequest.origins=origins;
   dm.getDistanceMatrix(
    DistanceMatrixRequest,
    function(DistanceMatrixResponse, DistanceMatrixStatus) {
      var x=DistanceMatrixResponse.rows[0].elements[0];
      callback.call(new Object,x.distance.value); // in meters});
    }
   );
 }

/****************************************************
  Haversine: distance between two coordinates
  http://www.movable-type.co.uk/scripts/latlong.html
****************************************************/

GMH.prototype.Haversine=function(pos1, pos2) {
  var R = 6371; // km
  var lat1=pos1.lat();
  var lat2=pos2.lat();
  var lon1=pos1.lng();
  var lon2=pos2.lng();

  var dLat = (lat2-lat1).toRad();
  var dLon = (lon2-lon1).toRad();
  var lat1 = lat1.toRad();
  var lat2 = lat2.toRad();
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  return d;
}

GMH.prototype.bestZoomLevel=function(sw, ne, pixelWidth) {
// http://stackoverflow.com/questions/6048975/google-maps-v3-how-to-calculate-the-zoom-level-for-a-given-bounds
  var west = sw.lng();
  var east = ne.lng();
  var angle = east - west;
  if (angle < 0) {
    angle += 360;
  }
  this.zoomLevel = Math.round(Math.log(pixelWidth * 360 / angle / this.GLOBE_WIDTH) / Math.LN2);
  
}

GMH.prototype.findInfowindowEnclosingDiv=function(name) {
  var b=this.element.getElementsByTagName('img');
  var i, j=b.length;
  var iw=this.infoWindows[name];
  var contents=iw.tempUUID;
  for (i=0; i<j; i++) {
    if(b[i].src.match('imgs8.png')){
      if(b[i].style.left=='-18px') {
        c=b[i].parentElement.parentElement;
        d=c.children[1].children[0];
        if(d!=undefined) {
          if (d.innerHTML==contents) {
            // we have the right one
            e=c.parentElement;
            this.infoWindows[name].enclosingDIV=e;
            // Now let's get the real enclosure
            var z=e.getElementsByTagName("div");
            for(y in z){
              if(z[y].style.border=="1px solid rgb(171, 171, 171)"){
                console.log("That's mah boy!",z[y]);
                z[y].style.zIndex=2;
                // Don't ask...
                this.infoWindows[name].realEnclosure=z[y];
                d.innerHTML=iw.savedText;
                return;
              }
            }
            return;
          }
        }
      }
    }
  }
  console.log("Couldn't find div");
}

GMH.prototype.setInfowindowStyle=function(name, options, target) {
  var iw=this.infoWindows[name];
  var e=iw.enclosingDIV;
  if(e==null) {
    this.findInfowindowEnclosingDiv(name);
    e=iw.enclosingDIV;
    if(e==null) {
      console.log("e is null, again. That shouldn't happen!");
      return;
    }
    iw.enclosingDIV=e;
  }
  var ee=iw.realEnclosure;
  if(target!=null) {
    if(target.substring(0,1)==".") {
      // a class. for the moment, we'll work with the first instance.
      var z=e.getElementsByClassName(target.substring(1));
      if(z==null) return;
      e=z[0];
      ee=e;
    } else if(target.substring(0,1)=="#") {
      // an id.
      var z=document.getElementById(target.substring(1));
      if(z==null) return;
      e=z;
      ee=e;
    }
  }
  for (var x in options) {
    if(options.hasOwnProperty(x)) {
      if(x.match(/(background|border|overflow)/i)!=null) {
        // background/border goes to ee, the real enclosure
        ee.style[x]=options[x];
      } else {
        e.style[x]=options[x];
      }
    }
  }
}

GMH.prototype.removeBubblePointerFromInfowindow=function(name) {
  var iw=this.infoWindows[name];
  var e=iw.enclosingDIV;
  var z=e.getElementsByTagName("img");
  var i=0;
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  z[i++].style.display='none';
  // remove the shadow;
  e=gmh.element;
  z=e.getElementsByTagName("img");
  for (i in z) {
    if(typeof(z[i])=="object") {
      if(z[i].src.match("iws3.png")!=null){
        z[i].style.display='none'
      }
    }
  }
}

GMH.prototype.slideInfowindowBy=function(name, w, h) {
  this.removeBubblePointerFromInfowindow(name);
  var m=gmh.infoWindows[name];
  var x=Number(m.enclosingDIV.style.left.replace("px",""))+w;
  var y=Number(m.enclosingDIV.style.top.replace("px",""))+h;
  m.enclosingDIV.style.left=x+"px";
  m.enclosingDIV.style.top=y+"px";
}

GMH.prototype.removeCloseBoxFromInfowindow=function(name) {
// You need to call findInfowindowEnclosingDiv first
  var b=gmh.infoWindows[name].enclosingDIV.getElementsByTagName('img');
  b=b[b.length-1];
  var c=b.parentElement.parentElement;
  var d=c.children[1].children[0];
  this.infoWindows[name].restoreMe=b;
  var e=b.parentElement;
  e.setAttribute("id", name);
  e.style.width='1px';
  e.style.height='1px';
  e.removeChild(b);
}

GMH.prototype.restoreCloseBoxFromInfowindow=function(name) {
  var iw=this.infoWindows[name];
  if(iw==null) return;
  var where=document.getElementById(name);
  where.style.width='10px';
  where.style.height='10px';
  var div = document.createElement('div');
  div.innerHTML = iw.restoreMe.outerHTML;
  where.appendChild(div.childNodes[0]);
}

GMH.prototype.staticMapURL=function() {
  var imgs=document.getElementsByTagName('img');
  for (x in imgs) {
    if(imgs[x].src!=null) {
      if(imgs[x].src.indexOf("StaticMapService.GetMapImage")>-1) {
        console.log(imgs[x].src);
        return imgs[x].src;
      }
    }
  }
  console.log("Static map not found. Hacking it by hand.");
  var currentPosition=map.getCenter();
  return "http://maps.google.com/maps/api/staticmap?sensor=false&center=" + currentPosition.lat() + "," + currentPosition.lng() + "&zoom="+map.getZoom()+"&size=512x512&markers=color:green|label:X|" + currentPosition.lat() + ',' + currentPosition.lng();

}

GMH.prototype.staticMapIMG=function() {
  var imgs=document.getElementsByTagName('img');
  for (x in imgs) {
    if(imgs[x].src!=null) {
      if(imgs[x].src.indexOf("StaticMapService.GetMapImage")>-1) {
        return imgs[x];
      }
    }
  }
}

GMH.prototype.scoutSpriteIMG=function() {
  var imgs=document.getElementsByTagName('img');
  for (x in imgs) {
    if(imgs[x].src!=null) {
      if(imgs[x].src.indexOf("cb_scout_sprite")>-1) {
        return imgs[x];
      }
    }
  }
}

GMH.prototype.scoutSpriteURL=function() {
  var imgs=document.getElementsByTagName('img');
  for (x in imgs) {
    if(imgs[x].src!=null) {
      if(imgs[x].src.indexOf("cb_scout_sprite")>-1) {
        return imgs[x].src;
      }
    }
  }
}

GMH.prototype.scoutSprite=function(name) {
  var sprite=this.scoutSpriteURL();
  console.log(sprite);
  var img=new Image;
  img.crossOrigin = "Anonymous";
  var c=document.getElementById('mySneakyCanvas');
  c.width=50;
  c.height=50;
  var ctx = c.getContext('2d');
  var m=this.markers[name];
  pos=m.position;
  var that=this;
  img.onload = function() {
    ctx.drawImage(img, 0, 0);
    var strDataURI = c.toDataURL("image/png");
    overlay = new google.maps.OverlayView();
    overlay.draw = function() {};
    console.log("that:", that);
    console.log("that.map:", that.map);
    overlay.setMap(that.map);
    console.log("pos", pos);
    console.log("overlay", overlay);
    point = overlay.getProjection().fromLatLngToContainerPixel(pos);
    console.log(point);
    c.style.left=(point.x-15)+"px";
    c.style.top=(point.y-25)+"px";
  }
  img.src = sprite;
}


GMH.prototype.staticMapIMG=function() {
  var src=this.staticMapURL();
  var img=document.createElement('img');
  img.src=src;
  return img;
}


// =====================================================
//                  Internal methods
// =====================================================
GMH.prototype.equal=function(a, b) {
// compares two positions
  if(a==null||b==null) return false;
  if(a.lat()!=b.lat()||a.lng()!=b.lng()) return false;
  return true;
}

/*
 UUID. The MIT License: Copyright (c) 2010 LiosK.
*/
GMH.prototype.generateUUID=function(){
  var a=this._getRandomInt, b=this._hexAligner;
  return b(a(32),8)+"-"+b(a(16),4)+"-"+b(16384|a(12),4)+"-"+b(32768|a(14),4)+"-"+b(a(48),12)
};
GMH.prototype._getRandomInt=function(a){
  if(a<0)return NaN;
  if(a<=30)return 0|Math.random()*(1<<a);
  if(a<=53)return(0|Math.random()*1073741824)+(0|Math.random()*(1<<a-30))*1073741824;
  return NaN
};
GMH.prototype._hexAligner=function(b, f) {
  var a=16;
    for(var c=b.toString(a),d=f-c.length,e="0";d>0;d>>>=1,e+=e)
      if(d&1)c=e+c;
    return c
}
