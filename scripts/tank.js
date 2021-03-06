aquaFun.Tank = function () {
	var self = this;
	var BreakException = {};

	// Tank Properites
	this.fishFood = $('#fish-food');
	this.tank = $('.tank');
	this.water = $('.water');
	this.allFish = [];
	this.allCleaners = [];

	this.poop = 0;

	// Utils
	this.getBounds = function () {
		return aquaFun.utils.props(this.water);
	};

	// Counters
	this.countHungryFish = function () {
		var hungryFish = 0;

		for (var fish of this.allFish) {
			hungryFish += (fish.food < 30 ? 1: 0);
		}

		if ((hungryFish / this.allFish.length) > 0.5) {
			aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.hungry);
			aquaFun.fishTank.ui.flickerButton(aquaFun.fishTank.ui.buttonKeys.food);
		}
	};

	this.countLiveFish = function () {
		return this.allFish.length;
	};

	this.countCleaners = function () {
		return $('.item').length;
	};

	this.fishToCleanerRatio = function () {
		return (this.countCleaners() / this.countLiveFish());
	};

	// Handlers - take care of events
	this.handleFishPoop = function () {
		self.poop++;

		if ((self.poop % 100) === 0) {
			self.handleWaterChanges(-0.05);
		}

		self.countHungryFish();
	};

	this.handleCleanWater = function (params) {
		// This one is a bit trickey, since poop is added one by one
		// but cleaners goble up more than that we need to go over
		for (var i = 0; i < params.cleaned; i++) {
			self.poop--;

			if (self.poop < 0) { self.poop = 0; }

			if ((self.poop % 100) === 0) {
				self.handleWaterChanges(0.1);
			}
		}
	};

	this.handleWaterChanges = function (value) {
		var waterOpacity = $(self.water).css('opacity');
		if (typeof waterOpacity === 'string') {
			waterOpacity = parseFloat(waterOpacity);
		}

		if (waterOpacity === 0.00) {
			aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.tooDirty);
			self.emptyTank();
			return false;
		}

		if ((self.countLiveFish() < 5) && (waterOpacity <= 0.5)) {
			aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.dirty);
		}

		if ((waterOpacity > 0.01) && (waterOpacity < 1.00)) {
			$(self.water).css({
				'opacity': waterOpacity + value
			});
		}
	};

	this.handleCleanerDone = function (params) {
		try {
			self.allCleaners.forEach(function (isThisCleanerDone, index) {
				if (isThisCleanerDone.id === params.id) {
					self.allCleaners.splice(index, 1);
					self.checkCleanerRatio();
					throw BreakException;
				}
			});
		} catch (e) {
			if (e !== BreakException) throw e;
		}
	};

	this.handleDeadFish = function (params) {
		try {
			self.allFish.forEach(function (isThisADeadFish, index) {
				if (isThisADeadFish.id === params.id) {
					self.allFish.splice(index, 1);
					self.checkFishRatio();
					throw BreakException;
				}
			});
		} catch (e) {
			if (e !== BreakException) throw e;
		}
	};

	this.afterDeathHandlers = function () {
		if (self.countLiveFish() === 0) {
			aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.end);
			self.emptyTank();

			return false;

		} else if (self.countLiveFish() < 3) {
			aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.lonely);
			aquaFun.fishTank.ui.flickerButton(aquaFun.fishTank.ui.buttonKeys.add);
		}
	};

	this.handleDeadFishEvent = function (params) {
		this.handleDeadFish(params);
		this.afterDeathHandlers();
	};

	// Select Fish/Cleaner images
	this.selectFishImage = function () {
		var imageIndex = aquaFun.utils.random(1, 3);

		switch (imageIndex) {
			case 1:
				return 'resources/images/blue-fish.png';
			case 2:
				return 'resources/images/orange-fish.png';
			case 3:
				return 'resources/images/colorfull-fish.png';
		}
	};

	this.selectCleanerImage = function () {
		var imageIndex = aquaFun.utils.random(1, 2);

		switch (imageIndex) {
			case 1:
				return 'resources/images/broom.png';
			case 2:
				return 'resources/images/vacuum-cleaner.png';
		}
	};

	// Actions
	this.emptyTank = function () {
		for (var fish of this.allFish) {
			fish.die(true);
		}

		for (var cleaner of this.allCleaners) {
			cleaner.done(true);
		}
	};

	this.checkFishRatio = function () {
		if (this.countCleaners() === 0) {
			if (this.countLiveFish() > 4) {
				aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.dirty);
			}
		} else if (this.fishToCleanerRatio() < 0.125) {
			aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.dirty);
		}
	};

	this.addFish = function () {
		var fish = new aquaFun.Fish(this, this.selectFishImage());
		fish.hatch();
		this.allFish.push(fish);
		$(this.tank).on('poop', this.handleFishPoop);
		$(this.tank).on('dead-fish', this.handleDeadFishEvent);

		this.checkFishRatio();
	};

	this.checkCleanerRatio = function () {
		if ((this.fishToCleanerRatio() > 0.25) && (this.countCleaners() > 7)) {
			aquaFun.messaging.postMessage(aquaFun.messaging.messageKeys.tooClean);
			aquaFun.fishTank.ui.flickerButton(aquaFun.fishTank.ui.buttonKeys.add);
		}
	};

	this.addCleaner = function () {
		var cleaner = new aquaFun.Cleaner(this, this.selectCleanerImage());
		cleaner.spawn();
		this.allCleaners.push(cleaner);
		$(this.tank).on('clean', this.handleCleanWater);
		$(this.tank).on('claner-done', this.handleCleanerDone);

		this.checkCleanerRatio();
	};

	this.feed = function () {
		$(this.fishFood).addClass('show').removeClass('hide');
		for (var fish of this.allFish) {
			fish.eat(aquaFun.utils.random(10, 50));
		}
		var endFeeding = setTimeout(function() {
			$(self.fishFood).addClass('hide').removeClass('show');
			clearTimeout(endFeeding);
		}, 2000);
	};
};
