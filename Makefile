lib_path = build/Library/Nextroom
dep_path = $(lib_path)/lib/python2.5
clean: 
	rm -Rf $(lib_path)
package:  clean
	@echo "Creating package tree in build"
	mkdir -p    $(lib_path)
	cp -R start-nextroom.sh $(lib_path)
	cp -R nextroom $(lib_path)
	cp -R lib      $(lib_path)
	cp -R media    $(lib_path)
	(cd $(dep_path) && tar xf ../../../../../deps/CherryPy-3.1.2.tar.gz)
	(cd $(dep_path) && tar xf ../../../../../deps/Django-1.1.1.tar.gz)
	
