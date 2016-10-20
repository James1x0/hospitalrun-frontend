import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';
import Ember from 'ember';
import UserSession from 'hospitalrun/mixins/user-session';

const { Route, RSVP, isEmpty, computed } = Ember;

/**
 * Abstract route for top level modules (eg patients, inventory, users)
 */
export default Route.extend(UserSession, AuthenticatedRouteMixin, {
  addCapability: null,
  additionalModels: null,
  allowSearch: true,
  currentScreenTitle: null,
  moduleName: null,
  newButtonText: null,
  sectionTitle: null,
  subActions: null,

  editPath: computed('moduleName', function () {
    return `${this.get('moduleName')}.edit`;
  }),

  deletePath: computed('moduleName', function () {
    return `${this.get('moduleName')}.delete`;
  }),

  newButtonAction: computed('addCapability', function () {
    return this.currentUserCan(this.get('addCapability')) ? 'newItem' : null;
  }),

  searchRoute: computed('moduleName', function () {
    return `/${this.get('moduleName')}/search`;
  }),

  actions: {
    allItems () {
      this.transitionTo(`${this.get('moduleName')}.index`);
    },

    deleteItem (item) {
      this.send('openModal', this.get('deletePath'), item);
    },

    editItem (item) {
      this.transitionTo(this.get('editPath'), item);
    },

    newItem () {
      if (this.currentUserCan(this.get('addCapability'))) {
        this.transitionTo(this.get('editPath'), 'new');
      }
    },

    /**
     * Action to set items in the section header.
     * @param details an object containing details to set on the section header.
     * The following parameters are supported:
     * - currentScreenTitle - The current screen title.
     * - newButtonText - The text to display for the "new" button.
     * - newButtonAction - The action to fire for the "new" button.
     */
    setSectionHeader (details) {
      let currentController = this.controllerFor(this.get('moduleName'));
      currentController.setProperties(details);
    }

  },

  /**
   * Make sure the user has permissions to the module; if not reroute to index.
   */
  beforeModel (transition) {
    let moduleName = this.get('moduleName');

    if ( this.currentUserCan(moduleName) ) {
      return this._super(transition);
    } else {
      this.transitionTo('index');
      return RSVP.reject('Not available');
    }
  },

  /**
   * Override this function to generate an id for a new record
   * @return a promise that will resolved to a generated id;default is null which means that an
   * id will be automatically generated via Ember data.
   */
  generateId () {
    return RSVP.resolve(null);
  },

  model () {
    let additionalModels = this.additionalModels;

    if ( !isEmpty(additionalModels) ) {
      return RSVP.map(additionalModels, modelMap => {
        let findArgs = modelMap.findArgs,
            storeMethod = findArgs.length === 1 ? 'findAll' : 'find';

        return this.store[storeMethod].apply(this.store, findArgs)
        .then(item => this.set(modelMap.name, item))
        .catch(err => {
          if ( err ) {
            throw err;
          }
        });
      }, `All additional Models for ${this.get('moduleName')}`);
    } else {
      return RSVP.resolve();
    }
  },

  renderTemplate () {
    this.render('section');
  },

  setupController ( controller ) {
    let navigationController = this.controllerFor('navigation'),
        currentController = this.controllerFor(this.get('moduleName')),
        props = [ 'additionalButtons', 'currentScreenTitle', 'newButtonAction', 'newButtonText', 'sectionTitle', 'subActions' ];

    if ( this.get('allowSearch') === true ) {
      navigationController.setProperties({
        allowSearch: true,
        searchRoute: this.get('searchRoute')
      });
    } else {
      navigationController.set('allowSearch', false);
    }

    currentController.setProperties(this.getProperties(props));

    if ( !isEmpty(this.additionalModels) ) {
      this.additionalModels.forEach(item => controller.set(item.name, this.get(item.name)));
    }

    this._super(...arguments);
  }
});
