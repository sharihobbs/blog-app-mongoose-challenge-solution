'use strict'

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the expect syntax available throughout
// this module
const expect = chai.expect;
const should = chai.should;

const { BlogPost } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function tearDownDb() {
  return new Promise((resolve, reject) => {
    console.warn('Deleting database');
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];
  for (let i=1; i<=10; i++) {
    seedData.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    });
  }
  return BlogPost.insertMany(seedData);
}

describe('blog posts API resource', function () {
  before(function () {
    return runServer(TEST_DATABASE_URL);
  });
  beforeEach(function () {
    return seedBlogData();
  });
  afterEach(function () {
    return tearDownDb();
  });
  after(function () {
    return closeServer();
  });

  describe('GET endpoint', function () {
    it('should return all existing endpoints', function () {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(_res => {
          res = _res;
          expect.res.to.have.status(200);
          expect.res.body.to.have.length.of.at.least(1);

          return BlogPost.count();
        })
        .then(count => {
          expect.res.body.to.have.length.of(count);
        });
    });

  it('should return posts with the right fields', function () {
    let resPost;
    return chai.request(app)
      .get('/posts')
      .then(function (res) {
        expect.res.to.have.status(200);
        expect.res.to.be.json;
        expect.res.body.to.be.a('array');
        expect.res.body.to.have.length.of.at.least(1);
        res.body.forEach(function (post) {
          expect.post.to.be.a('object');
          expect.post.to.include.keys('id', 'title', 'content', 'author', 'created');
        });
        resPost = res.body[0];
        return BlogPost.findByID(resPost.id);
      })
      .then(post => {
        expect.resPost.title.to.be(post.title);
        expect.resPost.content.to.be(post.content);
        expect.resPost.author.to.be(post.authorName);
      });
  });
});

describe('POST endpoint', function () {
  it('should add a new blog post', function () {
    const newPost = {
      title: faker.lorem.sentence(),
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
      },
      content: faker.lorem.text()
    };

    return chai.request(app)
      .post('/posts')
      .send(newPost)
      .then (function (res) {
        expect.res.to.have.status(201);
        expect.res.to.be.json;
        expect.res.body.to.be.a('object');
        expect.res.body.to.include.keys('id', 'title', 'content', 'author', 'created');
        expect.res.body.title.to.equal(newPost.title);
        expect.res.body.id.to.not.be.null;
        expect.res.body.author.to.equal(
          `${newPost.author.firstName} ${newPost.author.lastName}`);
        expect.res.body.content.to.equal(newPost.content);
        return BlogPost.findById(res.body.id);
      })
      .then(function (post) {
        expect.post.title.to.be.equal.to(newPost.title);
        expect.post.content.to.be.equal.to(newPost.content);
        expect.post.author.firstName.to.be.equal.to(newPost.author.firstName);
        expect.post.author.lastName.to.be.equal.to(newPost.author.lastName);
      });
  });
});

describe('PUT endpoint', function () {
    it('should update fields you send over', function () {
      const updatedPost = {
        title: 'this is a title',
        content: 'here is my content',
        author: {
          firstName: 'tony',
          lastName: 'thetiger'
        }
      };

      return BlogPost
        .findOne()
        .then(post => {
          updatedPost.id = post.id;
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updatedPost);
        })
        .then(res => {
          expect.res.to.have.status(204);
          return BlogPost.findById(updatedPost.id);
        })
        .then(post => {
          expect.post.title.to.be.equal.to(updatedPost.title);
          expect.post.content.to.be.equal.to(updatedPost.content);
          expect.post.author.firstName.to.be.equal.to(updatedPost.author.firstName);
          expect.post.author.lastName.to.be.equal.to(updatedPost.author.lastName);
        });
    });
  });

  describe('DELETE endpoint', function () {
    it('should delete a post by id', function () {
      let post;
      return BlogPost
        .findOne()
        .then(_post => {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(res => {
          expect.res.to.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(_post => {
          should.not.exist(_post);
        });
    });
  });
});

