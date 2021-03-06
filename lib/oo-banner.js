// Array randomization helper function
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

var cachedLocations = new SubsManager({
  cacheLimit: 9999,
  expireIn: 9999
});

var listItemImage = new SubsManager({
  cacheLimit: 9999,
  expireIn: 9999
});


Template.ooBanner.created = function () {
  var self = this;
  if (!self.data) {
    console.log('%c ooBanner no data passed to component   ',  'background: #5D76DB; color: white; padding: 1px 15px 1px 5px;');
    return
  }
  if (self.data.image) {
    self.activeImageLocal = new Blaze.ReactiveVar(self.data.localImg);
    self.activeImage = new Blaze.ReactiveVar(self.data.image);
    self.activeBackground = new Blaze.ReactiveVar(self.data.bannerBackground)
    self.activeImageId = new Blaze.ReactiveVar(self.data.docId)
    self.fullWidth = new Blaze.ReactiveVar(false);

  } else {
    self.activeImage = new Blaze.ReactiveVar('')
    self.activeImageLocal = new Blaze.ReactiveVar('')
    self.activeBackground = new Blaze.ReactiveVar('')
    self.currentPosition = new Blaze.ReactiveVar(0);
    self.activeImageId = new Blaze.ReactiveVar();
    self.fullWidth = new Blaze.ReactiveVar(false);
    self.bannerList = new Blaze.ReactiveVar([]);

    self.ready = new ReactiveVar(false);
    self.dataSourceArray = new Blaze.ReactiveVar([]);;
    if (self.data.subscription) {
      self.autorun(function () {
        var subscription = listItemImage.subscribe(self.data.subscription, self.data.location, Session.get('active_APP'));

        if (subscription.ready()) {
          if (self.data.multi) {
            self.dataSourceArray.set(Collection[self.data.collection].find({locationNames: self.data.location}).fetch());
          } else {
            self.dataSourceArray.set(Collection[self.data.collection].find({locationNames: self.data.location, appId: Session.get('active_APP')}).fetch());

          }
          // console.log(subscription.ready())

          self.ready.set(true);
        } else {
          if (self.data.multi && Meteor.isCordova) {

            Meteor.setTimeout(() => {
              if (!self.ready.get()) {
                self.dataSourceArray.set(Collection[self.data.collection].find({locationNames: self.data.location}).fetch());
                if (dataSourceArray.length > 0) {
                  self.ready.set(true);
                }
              }
            }, 1000);
          }
          self.ready.set(false);
        }
      });
    } else {
      if (self.data.cursor) {
        self.autorun(() => {
          self.dataSourceArray.set(self.data.cursor.fetch());
          self.ready.set(false);
          self.ready.set(true);

        })
      }
    }
    self.autorun(function() {
      // XXX use cursor on pub ready
      if (self.data.rotating && self.ready.get()) {
        // console.log('firina')
        // console.log(self.data.rotating && self.ready.get())
         // dataSourceArray = ["http://i.imgur.com/ynHObxS.png", "http://i.imgur.com/jseTTKB.png","http://i.imgur.com/jv4Rx9Q.png", "http://i.imgur.com/T8GVrs3.png"];
        self.bannerList.set(shuffle(self.dataSourceArray.get()));

        var currentItem = 0;

        self.currentPosition.set(currentItem);
        if (self.bannerList.get().length > 0) {
          self.activeImage.set(self.bannerList.get()[currentItem][self.data.imageField]);
          self.activeImageLocal.set(self.bannerList.get()[currentItem].localImg);
          self.activeImageId.set(self.bannerList.get()[currentItem]._id)
          self.activeBackground.set(self.bannerList.get()[currentItem].bannerBackground)
          self.fullWidth.set(!!self.bannerList.get()[currentItem].fullWidth)
          // console.log(self.bannerList.get()[currentItem])
          // console.log(self.bannerList.get()[currentItem]._id)
          if (!self.InsideInterval) {
            self.InsideInterval = Meteor.setInterval(function(){
              // console.log('setInterval', self.InsideInterval)
              var numberOfItems = self.bannerList.get().length
              if (numberOfItems > 1) {
                if (currentItem == numberOfItems -1){
                    currentItem = 0;
                } else {
                    currentItem++;
                }
              } else {
                currentItem = 0;
              }

              self.currentPosition.set(currentItem);
              self.activeImage.set(self.bannerList.get()[currentItem][self.data.imageField])
              self.activeImageLocal.set(self.bannerList.get()[currentItem].localImg)
              self.activeImageId.set(self.bannerList.get()[currentItem]._id)
            }, 8000)
          }
        }

      } else {
        if (self.InsideInterval) {
          Meteor.clearInterval(self.InsideInterval);
        }
      }
    })


  }

};

Template.ooBanner.destroyed = function () {
  var self = this;
  Meteor.clearInterval(self.InsideInterval)
}

Template.ooBanner.helpers({
  backgroundColor: function() {
    return Template.instance().activeBackground.get() ? Template.instance().activeBackground.get() : 'white'
  },
  ifAnyDataPassed: function() {
    return this.image || this.title || Template.instance().activeImage.get() ? true : false;
  },
  titlePassed: function() {
    return (typeof this.title !== 'undefined') ? true : false;
  },
  image:function () {
    return this.image ? this.image : Template.instance().activeImage.get();
  },
  imageLocal: function() {
    return this.localImg ? `/images/${this.localImg}` : `/images/${Template.instance().activeImageLocal.get()}`;
  },
  fullWidth: function() {
    return this.fullWidth ? this.fullWidth : !!Template.instance().fullWidth.get();
  },
  loadFromLocal: function() {
    return Meteor.isCordova;
  }
});

Template.ooBanner.events({
  'click .js-goToSponsor' : function (e, t) {
    var sponsor = Collection.offlineSponsors.findOne({_id: Template.instance().activeImageId.get()});
    if (sponsor._id) {

      if (sponsor.activeWebsite) {
        var httpLink = sponsor.urlLink.indexOf('http://') === -1 ? 'http://' + sponsor.urlLink : sponsor.urlLink;
        window.open(httpLink, '_system', 'location=yes')
        return;
      } else {
        if (!sponsor.disableProfile) {
          var catName= '';
          if (!sponsor.categoryName) {
            var cat = Collection.SponsorsCategory.findOne({_id: sponsor.sponsorCategory});
            catName = cat && cat.catName ? cat.catName : 'Sponsor'
            // console.log('cat')
            // console.log(cat)
          } else {
            catName = sponsor.categoryName;
          }
          ViewsControl.go('sponsorView', sponsor._id, sponsor.categoryName ? sponsor.categoryName : catName , 'offlineSponsors');
          statisticsAddCount('Sponsors', sponsor._id);
        }
      }

    }

    // ViewsControl.go('sponsorView', Template.instance().activeImageId.get(), this.catName, 'Sponsors');
  }
})
