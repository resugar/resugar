{
  foo: getFunc(function() {
    return setImmediate(() => {
        return this.foo2();
      }
    );
  })
};
